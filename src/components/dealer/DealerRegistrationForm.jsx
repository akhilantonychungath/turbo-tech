import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../common/Layout';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { useFilteredUsersByAccess } from '../../hooks/useFilteredUsersByAccess';
import {
  BasicInfoSection,
  MarketingInfoSection,
  OwnershipSection,
  AccessSection,
  BankDetailsSection,
  PartnershipSection,
  DocumentUploadSection
} from './DealerFormSections';

const DealerRegistrationForm = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Fetch services from database
  const { items: services } = useFirestoreCollection('services', {
    orderByField: 'serviceName',
    orderDirection: 'asc'
  });

  // Fetch users with userType='inside' for Opened By, Owner By, Serving By
  const { filteredUsers: insideUsers, loading: insideUsersLoading } = useFilteredUsersByAccess('inside');
  
  // Fetch users with roleName='Dealer Staff' for Staff/Partner
  const { filteredUsers: dealerStaffUsers, loading: dealerStaffLoading } = useFilteredUsersByAccess(null, 'Dealer Staff');
  
  // Fetch users with roleName='Dealer' for Dealer/Business Name
  const { filteredUsers: dealerUsers, loading: dealerUsersLoading } = useFilteredUsersByAccess(null, 'Dealer');
  const [formData, setFormData] = useState({
    type: '',
    showroomName: '',
    dealerName: '',
    gstNumber: '',
    panNumber: '',
    district: '',
    location: '',
    openedBy: '',
    ownerBy: '',
    servingBy: [],
    staffPartner: [],
    accessMode: '',
    adharCard: null,
    pancard: null,
    license: null,
    agreement: null
  });
  const [marketingInfo, setMarketingInfo] = useState([
    { services: '', potential: '' }
  ]);
  const [bankDetails, setBankDetails] = useState([
    { bankName: '', branchName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      // Clear showroomName if type is changed from "showroom" to something else
      if (name === 'type' && value !== 'showroom') {
        updated.showroomName = '';
      }
      return updated;
    });
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      [name]: file
    }));
  };

  const handleRemoveFile = useCallback((fileName) => {
    setFormData(prev => ({
      ...prev,
      [fileName]: null
    }));
    // Reset the file input
    const fileInput = document.querySelector(`input[name="${fileName}"]`);
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  const handleMarketingInfoChange = (index, field, value) => {
    setMarketingInfo(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleAddServices = () => {
    setMarketingInfo(prev => [...prev, { services: '', potential: '' }]);
  };

  const handleRemoveServices = (index) => {
    if (marketingInfo.length > 1) {
      setMarketingInfo(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleBankDetailsChange = (index, field, value) => {
    setBankDetails(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleAddBankDetails = () => {
    setBankDetails(prev => [...prev, { bankName: '', branchName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }]);
  };

  const handleRemoveBankDetails = (index) => {
    if (bankDetails.length > 1) {
      setBankDetails(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleServingByChange = useCallback((transactionId) => {
    if (!transactionId) return;
    setFormData(prev => {
      const currentServingBy = Array.isArray(prev.servingBy) ? prev.servingBy : (prev.servingBy ? [prev.servingBy] : []);
      const currentIds = currentServingBy.map(id => String(id));
      const targetId = String(transactionId);
      
      if (currentIds.includes(targetId)) {
        return {
          ...prev,
          servingBy: currentServingBy.filter(id => String(id) !== targetId)
        };
      } else {
        return {
          ...prev,
          servingBy: [...currentServingBy, transactionId]
        };
      }
    });
  }, []);

  const handleStaffPartnerChange = useCallback((transactionId) => {
    if (!transactionId) return;
    setFormData(prev => {
      const currentStaffPartner = Array.isArray(prev.staffPartner) ? prev.staffPartner : (prev.staffPartner ? [prev.staffPartner] : []);
      const currentIds = currentStaffPartner.map(id => String(id));
      const targetId = String(transactionId);
      
      if (currentIds.includes(targetId)) {
        return {
          ...prev,
          staffPartner: currentStaffPartner.filter(id => String(id) !== targetId)
        };
      } else {
        return {
          ...prev,
          staffPartner: [...currentStaffPartner, transactionId]
        };
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate servingBy has at least one selection
    if (!formData.servingBy || formData.servingBy.length === 0) {
      setError('Please select at least one user for Serving By');
      return;
    }
    
    setLoading(true);

    try {
      // Upload files to Firebase Storage (if present) and collect their download URLs
      const fileFields = ['adharCard', 'pancard', 'license', 'agreement'];
      const uploadedUrls = {};

      const uploadFile = async (file, path) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      };

      for (const field of fileFields) {
        const file = formData[field];
        if (file) {
          const fileName = `${field}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
          const path = `dealers/${currentUser?.uid || 'anon'}/${fileName}`;
          try {
            const url = await uploadFile(file, path);
            uploadedUrls[`${field}Url`] = url;
          } catch (uploadErr) {
            console.error(`Failed to upload ${field}:`, uploadErr);
            // don't block the whole submission for a single file failure, but record an error
            setError(prev => prev ? prev + `; ${field} upload failed` : `${field} upload failed`);
          }
        }
      }

      // Helper to find user snapshot by transactionId from available users
      const findUserByTransaction = (transactionId) => {
        if (!transactionId) return null;
        // Combine all available user lists to search
        const allUsers = [...insideUsers, ...dealerStaffUsers, ...dealerUsers];
        return allUsers.find(u => u.transactionId === transactionId) || null;
      };

      // Build dealer document — explicit about fields we want to save
      const dealerData = {
        type: formData.type,
        showroomName: formData.showroomName,
        dealerNameTransactionId: formData.dealerName || '',
        gstNumber: formData.gstNumber,
        panNumber: formData.panNumber,
        district: formData.district,
        location: formData.location,
        accessMode: formData.accessMode,
        marketingInfo: marketingInfo,
        bankDetails: bankDetails,
        // add uploaded file URLs (if any)
        ...uploadedUrls,
        // store transactionId references
        openedByTransactionId: formData.openedBy || '',
        ownerByTransactionId: formData.ownerBy || '',
        servingByTransactionIds: Array.isArray(formData.servingBy) ? formData.servingBy : (formData.servingBy ? [formData.servingBy] : []),
        staffPartnerTransactionIds: Array.isArray(formData.staffPartner) ? formData.staffPartner : (formData.staffPartner ? [formData.staffPartner] : []),
        // meta
        userId: currentUser?.uid || '',
        userEmail: currentUser?.email || '',
        createdAt: new Date(),
        status: 'pending'
      };

      await addDoc(collection(db, 'dealers'), dealerData);

      setSuccess(true);
      setTimeout(() => {
        navigate('/dealers');
      }, 2000);
    } catch (err) {
      console.error('Error submitting dealer registration:', err);
      setError('Failed to submit registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout title="Dealer Registration">
        <div className="flex items-center justify-center px-4 min-h-[calc(100vh-80px)]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h3>
            <p className="text-gray-600">Your dealer registration has been submitted successfully.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dealer Registration">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2">
                <span className="material-symbols-outlined w-6 h-6">store</span>
              </div>
              <h2 className="text-2xl font-bold">Dealer Registration</h2>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl">
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BasicInfoSection
                formData={formData}
                handleChange={handleChange}
                dealerUsers={dealerUsers}
                dealerUsersLoading={dealerUsersLoading}
              />

              <MarketingInfoSection
                marketingInfo={marketingInfo}
                services={services}
                handleMarketingInfoChange={handleMarketingInfoChange}
                handleAddServices={handleAddServices}
                handleRemoveServices={handleRemoveServices}
              />

              <OwnershipSection
                formData={formData}
                handleChange={handleChange}
                handleServingByChange={handleServingByChange}
                insideUsers={insideUsers}
                insideUsersLoading={insideUsersLoading}
              />

              <AccessSection
                formData={formData}
                handleChange={handleChange}
              />

              <BankDetailsSection
                bankDetails={bankDetails}
                handleBankDetailsChange={handleBankDetailsChange}
                handleAddBankDetails={handleAddBankDetails}
                handleRemoveBankDetails={handleRemoveBankDetails}
              />

              <PartnershipSection
                formData={formData}
                handleStaffPartnerChange={handleStaffPartnerChange}
                dealerStaffUsers={dealerStaffUsers}
                dealerStaffLoading={dealerStaffLoading}
              />

              <DocumentUploadSection
                formData={formData}
                handleFileChange={handleFileChange}
                handleRemoveFile={handleRemoveFile}
                isEditMode={false}
              />
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Registration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default DealerRegistrationForm;

