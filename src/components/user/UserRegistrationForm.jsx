import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import LoadingSpinner from '../ui/LoadingSpinner';
import ImageCropModal from '../ui/ImageCropModal';

const UserRegistrationForm = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [profilePicFile, setProfilePicFile] = useState(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    whatsappNumber: '',
    userRoleId: '',
    profilePicUrl: '',
    isOfflineUser: true
  });

  const { items: userRoles, loading: userRolesLoading } = useFirestoreCollection('userRoles', {
    orderByField: 'roleName',
    orderDirection: 'asc',
    autoFetch: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
  };

  const handleCropComplete = async (croppedBlob) => {
    try {
      setUploadingPic(true);
      setShowCropModal(false);
      
      // Create a File object from the blob
      const fileName = `${Date.now()}_profile.jpg`;
      const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' });
      
      setProfilePicFile(croppedFile);

      // Use currentUser UID if available, otherwise use a temporary path
      const userId = currentUser?.uid || 'temp';
      const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
      
      await uploadBytes(storageRef, croppedFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Set the URL in the form data
      setFormData(prev => ({
        ...prev,
        profilePicUrl: downloadURL
      }));
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      let errorMessage = 'Failed to upload profile picture. Please try again.';
      if (err.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload files. Please contact an administrator.';
      } else if (err.code === 'storage/canceled') {
        errorMessage = 'Upload was canceled. Please try again.';
      } else if (err.code === 'storage/unknown') {
        errorMessage = 'An unknown error occurred. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = `Upload failed: ${err.message}`;
      }
      setError(errorMessage);
      setProfilePicFile(null);
    } finally {
      setUploadingPic(false);
    }
  };

  const handleRemoveFile = () => {
    setProfilePicFile(null);
    setFormData(prev => ({
      ...prev,
      profilePicUrl: ''
    }));
    // Reset file input
    const fileInput = document.querySelector('input[name="profilePicFile"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate Indian mobile number if provided
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
      const cleanedPhone = formData.phoneNumber.trim().replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        setError('Please enter a valid Indian mobile number (10 digits starting with 6, 7, 8, or 9)');
        return;
      }
    }

    // Validate Indian WhatsApp number if provided
    if (formData.whatsappNumber && formData.whatsappNumber.trim()) {
      const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
      const cleanedWhatsApp = formData.whatsappNumber.trim().replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanedWhatsApp)) {
        setError('Please enter a valid Indian WhatsApp number (10 digits starting with 6, 7, 8, or 9)');
        return;
      }
    }

    if (!formData.userRoleId) {
      setError('User role is required');
      return;
    }

    try {
      setLoading(true);
      
      // Find the selected user role to get its roleName
      const selectedUserRole = userRoles.find(role => role.id === formData.userRoleId);
      const roleName = selectedUserRole?.roleName || '';
      
      // Format phone number (remove spaces, dashes, normalize)
      let formattedPhoneNumber = '';
      if (formData.phoneNumber && formData.phoneNumber.trim()) {
        const cleanedPhone = formData.phoneNumber.trim().replace(/[\s-]/g, '');
        // If starts with +91, keep it; if starts with 91, add +; if starts with 0, remove it; otherwise add +91
        if (cleanedPhone.startsWith('+91')) {
          formattedPhoneNumber = cleanedPhone;
        } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
          formattedPhoneNumber = '+' + cleanedPhone;
        } else if (cleanedPhone.startsWith('0') && cleanedPhone.length === 11) {
          formattedPhoneNumber = '+91' + cleanedPhone.substring(1);
        } else if (cleanedPhone.length === 10) {
          formattedPhoneNumber = '+91' + cleanedPhone;
        } else {
          formattedPhoneNumber = cleanedPhone;
        }
      }

      // Format WhatsApp number (remove spaces, dashes, normalize)
      let formattedWhatsAppNumber = '';
      if (formData.whatsappNumber && formData.whatsappNumber.trim()) {
        const cleanedWhatsApp = formData.whatsappNumber.trim().replace(/[\s-]/g, '');
        // If starts with +91, keep it; if starts with 91, add +; if starts with 0, remove it; otherwise add +91
        if (cleanedWhatsApp.startsWith('+91')) {
          formattedWhatsAppNumber = cleanedWhatsApp;
        } else if (cleanedWhatsApp.startsWith('91') && cleanedWhatsApp.length === 12) {
          formattedWhatsAppNumber = '+' + cleanedWhatsApp;
        } else if (cleanedWhatsApp.startsWith('0') && cleanedWhatsApp.length === 11) {
          formattedWhatsAppNumber = '+91' + cleanedWhatsApp.substring(1);
        } else if (cleanedWhatsApp.length === 10) {
          formattedWhatsAppNumber = '+91' + cleanedWhatsApp;
        } else {
          formattedWhatsAppNumber = cleanedWhatsApp;
        }
      }
      
      // Create new user document
      await addDoc(collection(db, 'users'), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: formattedPhoneNumber,
        whatsappNumber: formattedWhatsAppNumber,
        userRoleId: formData.userRoleId,
        roleName: roleName,
        profilePicUrl: formData.profilePicUrl || '',
        isOfflineUser: formData.isOfflineUser || false,
        status: 'pending',
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/users');
      }, 2000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  if (userRolesLoading) {
    return (
      <Layout title="Add User">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner message="Loading user roles..." />
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title="Add User">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">User Created!</h3>
              <p className="text-gray-600">User has been created successfully.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Add User">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">person_add</span>
                </div>
                <h2 className="text-2xl font-bold">Add User</h2>
              </div>
              <button
                onClick={() => navigate('/users')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to User List
              </button>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl">
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Input */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Email Input */}
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter email address"
                  required
                />
              </div>

              {/* Phone Number Input */}
              <div className="md:col-span-2">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  maxLength={14}
                  pattern="(\+91|91|0)?[6-9]\d{9}"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="+91 9876543210"
                />
              </div>

              {/* WhatsApp Number Input */}
              <div className="md:col-span-2">
                <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={handleChange}
                  maxLength={14}
                  pattern="(\+91|91|0)?[6-9]\d{9}"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="+91 9876543210"
                />
              </div>

              {/* User Role Dropdown */}
              <div className="md:col-span-2">
                <label htmlFor="userRoleId" className="block text-sm font-medium text-gray-700 mb-2">
                  User Role <span className="text-red-500">*</span>
                </label>
                {userRolesLoading ? (
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 text-sm">
                    Loading roles...
                  </div>
                ) : (
                  <CustomSelect
                    name="userRoleId"
                    value={formData.userRoleId}
                    onChange={handleChange}
                    required
                    placeholder="Select user role"
                    options={userRoles.map((userRole) => ({
                      value: userRole.id,
                      label: userRole.roleName
                    }))}
                    showRoleChip={false}
                  />
                )}
              </div>

              {/* Offline User Checkbox */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 p-4 border border-gray-300 rounded-xl bg-gray-50">
                  <input
                    id="isOfflineUser"
                    name="isOfflineUser"
                    type="checkbox"
                    checked={formData.isOfflineUser}
                    onChange={handleChange}
                    disabled={true}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-not-allowed opacity-60"
                  />
                  <label htmlFor="isOfflineUser" className="text-sm font-medium text-gray-700 cursor-not-allowed">
                    Offline User
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500 ml-1">All registered users are offline users by default</p>
              </div>

              {/* Profile Picture File Upload - Only show if offline user */}
              {formData.isOfflineUser && (
                <div className="md:col-span-2">
                  <label htmlFor="profilePicFile" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Profile Picture <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profilePicFile"
                      name="profilePicFile"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploadingPic}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${uploadingPic ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {uploadingPic && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {profilePicFile && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-600">{profilePicFile.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {formData.profilePicUrl && (
                    <p className="mt-2 text-xs text-green-600">✓ Profile picture uploaded successfully</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Upload an image file (max 5MB). The URL will be automatically set.</p>
                </div>
              )}

              {/* Profile Picture URL - Hidden if offline user */}
              {!formData.isOfflineUser && (
                <div className="md:col-span-2">
                  <label htmlFor="profilePicUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture URL
                  </label>
                  <input
                    id="profilePicUrl"
                    name="profilePicUrl"
                    type="url"
                    value={formData.profilePicUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="https://example.com/profile.jpg"
                  />
                </div>
              )}

            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-4 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedFile(null);
          // Reset file input
          const fileInput = document.querySelector('input[name="profilePicFile"]');
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

export default UserRegistrationForm;

