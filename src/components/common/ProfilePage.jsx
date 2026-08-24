import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserStatus } from '../../contexts/UserStatusContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, updateProfile } from '../../firebase';
import { auth } from '../../firebase';
import Layout from './Layout';
import ImageCropModal from '../ui/ImageCropModal';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { refreshUserStatus, isUserBlockedOrNotApproved, userStatus } = useUserStatus();
  const [name, setName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const checkProfileStatus = useCallback(async () => {
    try {
      if (!currentUser) return;

      setIsLoadingProfile(true);

      // Check Firestore for profile data
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      let initialName = '';
      let initialRoleName = '';
      let initialPicUrl = '';
      let isComplete = false;
      let shouldEdit = false;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        initialName = userData.name || '';
        initialRoleName = userData.roleName || '';
        initialPicUrl = userData.profilePicUrl || '';
        isComplete = !!userData.name;
        shouldEdit = !isComplete; // Edit mode if profile is incomplete
      } else {
        // New user - show form
        shouldEdit = true;
        isComplete = false;
      }

      // Set initial values from auth as fallback
      if (!initialName && currentUser.displayName) {
        initialName = currentUser.displayName;
      }
      if (!initialPicUrl && currentUser.photoURL) {
        initialPicUrl = currentUser.photoURL;
      }

      // Update all states at once to prevent flickering
      setName(initialName);
      setRoleName(initialRoleName);
      setProfilePicUrl(initialPicUrl);
      setProfileComplete(isComplete);
      setIsEditing(shouldEdit);
    } catch (err) {
      console.error('Error checking profile status:', err);
      setIsEditing(true);
      setProfileComplete(false);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    // Check if profile is already complete
    checkProfileStatus();
  }, [currentUser, navigate, checkProfileStatus]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setError('');
      setSelectedFile(file);
      setShowCropModal(true);
    }
  };

  const handleCropComplete = async (croppedBlob) => {
    try {
      setUploadingPic(true);
      setShowCropModal(false);
      
      // Create a File object from the blob
      const fileName = `${Date.now()}_profile.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      
      setProfilePic(croppedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicPreview(reader.result);
      };
      reader.readAsDataURL(croppedFile);
    } catch (err) {
      console.error('Error processing cropped image:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);

      let finalProfilePicUrl = profilePicUrl;

      // Upload profile picture if selected
      if (profilePic) {
        const storageRef = ref(storage, `profile-pictures/${currentUser.uid}/${Date.now()}_${profilePic.name}`);
        await uploadBytes(storageRef, profilePic);
        finalProfilePicUrl = await getDownloadURL(storageRef);
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: name.trim(),
        photoURL: finalProfilePicUrl || auth.currentUser.photoURL
      });

      // Save to Firestore - only send allowed fields: email, name, profilePicUrl, updatedAt
      // This aligns with Firestore rules that restrict users to only update these fields
      const userDocRef = doc(db, 'users', currentUser.uid);
      const updateData = {
        name: name.trim(),
        profilePicUrl: finalProfilePicUrl || '',
        email: currentUser.email,
        updatedAt: new Date()
      };
      
      // Check if document exists to determine if this is create or update
      const userDoc = await getDoc(userDocRef);
      
      // Only set createdAt on initial creation (when document doesn't exist)
      if (!userDoc.exists()) {
        updateData.createdAt = new Date();
      }
      
      // Use merge: true to preserve other fields (like roleName, status, etc.) that are managed by admins
      await setDoc(userDocRef, updateData, { merge: true });

      setProfilePicUrl(finalProfilePicUrl);
      setProfilePicPreview(null);
      setProfilePic(null);
      setIsEditing(false);
      setProfileComplete(true);

      // Refresh profile check in App.js
      if (window.refreshProfileCheck) {
        window.refreshProfileCheck();
      }

      // Refresh user status
      refreshUserStatus();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (profileComplete) {
      setIsEditing(false);
      checkProfileStatus(); // Reload original values
    } else {
      setError('Please complete your profile to continue');
    }
  };

  const displayPic = profilePicPreview || profilePicUrl || currentUser?.photoURL;


  return (
    <Layout title="Profile">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Profile
            </h1>
            <p className="text-gray-600">
              View and edit your profile information
            </p>
          </div>

          {/* Error Message for Blocked Users */}
          {userStatus.isBlocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <span className="material-symbols-outlined w-5 h-5 text-red-600 flex-shrink-0 mt-0.5">error</span>
              <p className="text-sm text-red-800 font-medium">
                Your account has been blocked.
              </p>
            </div>
          )}

          {/* Warning Message for Unapproved Users (but not blocked) */}
          {!userStatus.isBlocked && userStatus.status !== 'approved' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-yellow-800 font-medium">
                Please be patient while your access request is being approved.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {isLoadingProfile ? (
              /* Loading Animation - matches original screen layout */
              <div className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col items-center">
                  <div className="h-4 bg-gray-200 rounded w-28 mb-4 animate-pulse mx-auto"></div>
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center animate-pulse">
                      <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 bg-blue-200 rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                {/* Form Fields Skeleton */}
                <div className="space-y-4">
                  {/* Full Name Field */}
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
                  </div>
                  
                  {/* Email Field */}
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-12 bg-gray-50 rounded-xl border border-gray-200 animate-pulse"></div>
                  </div>
                </div>
                
                {/* Action Buttons Skeleton */}
                <div className="flex gap-4 pt-4">
                  <div className="flex-1 h-12 bg-blue-200 rounded-xl animate-pulse"></div>
                </div>
              </div>
            ) : isEditing ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  {/* Profile Picture Section */}
                  <div className="flex flex-col items-center">
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Profile Picture <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      {displayPic ? (
                        <img
                          src={displayPic}
                          alt="Profile Preview"
                          className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg object-cover"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <label
                        htmlFor="profilePic"
                        className={`absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg ${uploadingPic ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingPic ? (
                          <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                        <input
                          id="profilePic"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={uploadingPic}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {profilePic && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePic(null);
                          setProfilePicPreview(null);
                          // Reset file input
                          const fileInput = document.querySelector('input[id="profilePic"]');
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>

                  {/* Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  {/* Email Display (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-gray-900">{currentUser?.email || 'Not available'}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        profileComplete ? 'Update Profile' : 'Save & Continue'
                      )}
                    </button>
                    {profileComplete && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading}
                        className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  {displayPic ? (
                    <img
                      src={displayPic}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-blue-500 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  {/* User Role Badge - only show if roleName is set */}
                  {roleName && (
                    <div className="mt-4">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-md bg-blue-600">
                        {roleName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-gray-900">{name || currentUser?.displayName || 'Not set'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-gray-900">{currentUser?.email || 'Not available'}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedFile(null);
          // Reset file input
          const fileInput = document.querySelector('input[id="profilePic"]');
          if (fileInput) {
            fileInput.value = '';
          }
        }}
        imageFile={selectedFile}
        onCropComplete={handleCropComplete}
      />
    </Layout>
  );
};

export default ProfilePage;

