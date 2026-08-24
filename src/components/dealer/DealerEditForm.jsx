import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { deleteField } from 'firebase/firestore';
import { storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useDealerEdit } from '../../hooks';
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

const DealerEditForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
  
  const {
    formData,
    setFormData,
    marketingInfo,
    bankDetails,
    loading: hookLoading,
    fetching,
    error,
    setError,
    handleChange,
    handleFileChange,
    handleRemoveFile,
    handleMarketingInfoChange,
    handleAddServices,
    handleRemoveServices,
    handleBankDetailsChange,
    handleAddBankDetails,
    handleRemoveBankDetails,
    updateDealer
  } = useDealerEdit(id);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRemoveFileWithReset = useCallback((fileName) => {
    // Clear the file field (both File object and URL string)
    setFormData(prev => ({
      ...prev,
      [fileName]: null
    }));
    // Also clear the URL field if it exists
    const urlFieldName = `${fileName}Url`;
    setFormData(prev => {
      const updated = { ...prev };
      delete updated[urlFieldName];
      return updated;
    });
    // Reset the file input
    setTimeout(() => {
      const fileInput = document.querySelector(`input[name="${fileName}"]`);
      if (fileInput) {
        fileInput.value = '';
      }
    }, 0);
  }, [setFormData]);

  const handleServingByChange = useCallback((transactionId) => {
    if (!transactionId) return;
    setFormData(prev => {
      // Ensure servingBy is always an array
      const currentServingBy = Array.isArray(prev.servingBy) ? prev.servingBy : (prev.servingBy ? [prev.servingBy] : []);
      // Convert all to strings for consistent comparison
      const currentIds = currentServingBy.map(id => String(id));
      const targetId = String(transactionId);
      
      if (currentIds.includes(targetId)) {
        // Remove if already selected (toggle off)
        return {
          ...prev,
          servingBy: currentServingBy.filter(id => String(id) !== targetId)
        };
      } else {
        // Add if not selected (toggle on) - no duplicates possible
        return {
          ...prev,
          servingBy: [...currentServingBy, transactionId]
        };
      }
    });
  }, [setFormData]);

  const handleStaffPartnerChange = useCallback((transactionId) => {
    if (!transactionId) return;
    setFormData(prev => {
      // Ensure staffPartner is always an array
      const currentStaffPartner = Array.isArray(prev.staffPartner) ? prev.staffPartner : (prev.staffPartner ? [prev.staffPartner] : []);
      // Convert all to strings for consistent comparison
      const currentIds = currentStaffPartner.map(id => String(id));
      const targetId = String(transactionId);
      
      if (currentIds.includes(targetId)) {
        // Remove if already selected (toggle off)
        return {
          ...prev,
          staffPartner: currentStaffPartner.filter(id => String(id) !== targetId)
        };
      } else {
        // Add if not selected (toggle on) - no duplicates possible
        return {
          ...prev,
          staffPartner: [...currentStaffPartner, transactionId]
        };
      }
    });
  }, [setFormData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    // Validate servingBy has at least one selection
    const servingByArray = Array.isArray(formData.servingBy) ? formData.servingBy : (formData.servingBy ? [formData.servingBy] : []);
    if (servingByArray.length === 0) {
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
        // Only upload if it's a File object (new file selected)
        // Existing URLs are strings, new files are File objects
        if (file && file instanceof File) {
          const fileName = `${field}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
          const path = `dealers/${currentUser?.uid || 'anon'}/${fileName}`;
          try {
            const url = await uploadFile(file, path);
            uploadedUrls[`${field}Url`] = url;
          } catch (uploadErr) {
            console.error(`Failed to upload ${field}:`, uploadErr);
            setError(prev => prev ? prev + `; ${field} upload failed` : `${field} upload failed`);
            // Continue with other files, but don't add this URL
          }
        } else if (file && typeof file === 'string') {
          // Preserve existing URL if no new file was uploaded
          uploadedUrls[`${field}Url`] = file;
        } else if (file === null) {
          // File was removed, use deleteField() to remove it from Firestore
          uploadedUrls[`${field}Url`] = deleteField();
        }
      }

      // Transform servingBy to array of transaction IDs
      const servingByTransactionIds = Array.isArray(formData.servingBy) 
        ? formData.servingBy 
        : (formData.servingBy ? [formData.servingBy] : []);

      // Transform staffPartner to array of transaction IDs
      const staffPartnerTransactionIds = Array.isArray(formData.staffPartner) 
        ? formData.staffPartner 
        : (formData.staffPartner ? [formData.staffPartner] : []);

      const updatedFormData = {
        ...formData,
        // Add uploaded file URLs (if any new files were uploaded)
        ...uploadedUrls,
        // Store transactionId references
        openedByTransactionId: formData.openedBy || '',
        ownerByTransactionId: formData.ownerBy || '',
        // Store dealerName as transactionId
        dealerNameTransactionId: formData.dealerName || '',
        servingByTransactionIds,
        staffPartnerTransactionIds
      };
      
      // Remove fields that should not be saved
      delete updatedFormData.dealerName;
      delete updatedFormData.dealerNameDisplay;
      delete updatedFormData.openedByName;
      delete updatedFormData.ownerByName;
      delete updatedFormData.servingByNames;
      delete updatedFormData.staffPartnerNames;
      delete updatedFormData.servingBy;
      delete updatedFormData.staffPartner;
      // Remove file objects and old URL fields (keep only new URL fields)
      fileFields.forEach(field => {
        delete updatedFormData[field]; // Remove the field itself (File object or old URL)
      });

      await updateDealer(updatedFormData, marketingInfo, bankDetails, currentUser);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dealers');
      }, 2000);
    } catch (err) {
      console.error('Error updating dealer:', err);
      setError('Failed to update dealer. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, marketingInfo, bankDetails, currentUser, updateDealer, navigate, setError, id]);

  if (fetching) {
    return (
      <Layout title="Edit Dealer">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading dealer data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title="Edit Dealer">
        <div className="flex items-center justify-center px-4 min-h-[calc(100vh-80px)]">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Dealer Updated!</h3>
            <p className="text-gray-600">Dealer information has been updated successfully.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Dealer">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">store</span>
                </div>
                <h2 className="text-2xl font-bold">Edit Dealer</h2>
              </div>
              <button
                onClick={() => navigate('/dealers')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to Dealers List
              </button>
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
                handleRemoveFile={handleRemoveFileWithReset}
                isEditMode={true}
              />
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => navigate('/dealers')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || hookLoading}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading || hookLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Dealer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default DealerEditForm;

