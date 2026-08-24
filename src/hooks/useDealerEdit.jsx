import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

const useDealerEdit = (dealerId) => {
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
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchDealerData = useCallback(async () => {
    if (!dealerId) {
      setFetching(false);
      return;
    }

    try {
      setFetching(true);
      setError('');
      const dealerRef = doc(db, 'dealers', dealerId);
      const dealerSnap = await getDoc(dealerRef);
      
      if (dealerSnap.exists()) {
        const data = dealerSnap.data();
        // Handle servingBy - support both old format (string) and new format (array)
        let servingByValue = [];
        if (data.servingByTransactionIds && Array.isArray(data.servingByTransactionIds)) {
          servingByValue = data.servingByTransactionIds;
        } else if (data.servingBy) {
          // Legacy format: single string value
          servingByValue = [data.servingBy];
        } else if (data.servingByTransactionId) {
          // Another legacy format
          servingByValue = [data.servingByTransactionId];
        }

        // Handle staffPartner - support both old format (string) and new format (array)
        let staffPartnerValue = [];
        if (data.staffPartnerTransactionIds && Array.isArray(data.staffPartnerTransactionIds)) {
          staffPartnerValue = data.staffPartnerTransactionIds;
        } else if (data.staffPartner) {
          // Legacy format: single string value
          staffPartnerValue = [data.staffPartner];
        } else if (data.staffPartnerTransactionId) {
          // Another legacy format
          staffPartnerValue = [data.staffPartnerTransactionId];
        }

        setFormData({
          type: data.type || '',
          showroomName: data.showroomName || '',
          dealerName: data.dealerNameTransactionId || data.dealerName || '',
          gstNumber: data.gstNumber || '',
          panNumber: data.panNumber || '',
          district: data.district || '',
          location: data.location || '',
          openedBy: data.openedByTransactionId || data.openedBy || '',
          ownerBy: data.ownerByTransactionId || data.ownerBy || '',
          servingBy: servingByValue,
          staffPartner: staffPartnerValue,
          accessMode: data.accessMode || '',
          // Store existing file URLs (they will be strings, not File objects)
          adharCard: data.adharCardUrl || data.adharCard || null,
          pancard: data.pancardUrl || data.pancard || null,
          license: data.licenseUrl || data.license || null,
          agreement: data.agreementUrl || data.agreement || null
        });
        
        // Set marketing info
        if (data.marketingInfo && Array.isArray(data.marketingInfo) && data.marketingInfo.length > 0) {
          setMarketingInfo(data.marketingInfo);
        } else {
          setMarketingInfo([{ services: '', potential: '' }]);
        }
        
        // Set bank details
        if (data.bankDetails && Array.isArray(data.bankDetails) && data.bankDetails.length > 0) {
          setBankDetails(data.bankDetails);
        } else {
          setBankDetails([{ bankName: '', branchName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }]);
        }
      } else {
        setError('Dealer not found');
      }
    } catch (err) {
      console.error('Error fetching dealer data:', err);
      setError('Failed to load dealer data. Please try again.');
    } finally {
      setFetching(false);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchDealerData();
  }, [fetchDealerData]);

  const updateDealer = useCallback(async (updatedData, marketingData, bankData, currentUser) => {
    if (!dealerId) {
      throw new Error('Dealer ID is required');
    }

    setLoading(true);
    setError('');

    try {
      const dealerRef = doc(db, 'dealers', dealerId);
      await updateDoc(dealerRef, {
        ...updatedData,
        marketingInfo: marketingData,
        bankDetails: bankData,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid || '',
        updatedByEmail: currentUser?.email || ''
      });
      return true;
    } catch (err) {
      console.error('Error updating dealer:', err);
      setError('Failed to update dealer. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  const handleChange = useCallback((e) => {
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
  }, []);

  const handleFileChange = useCallback((e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      [name]: file
    }));
  }, []);

  const handleRemoveFile = useCallback(async (fileName) => {
    setFormData(prev => {
      const currentValue = prev[fileName];
      const isExistingFile = currentValue && typeof currentValue === 'string' && 
        (currentValue.startsWith('http://') || currentValue.startsWith('https://'));
      
      // If it's an existing file (URL), delete it from Firebase Storage
      if (isExistingFile) {
        try {
          // Extract file path from Firebase Storage URL
          // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
          const url = new URL(currentValue);
          let filePath = '';
          
          if (url.pathname.includes('/o/')) {
            // Extract the encoded path
            const encodedPath = url.pathname.split('/o/')[1]?.split('?')[0] || '';
            // Decode the path
            filePath = decodeURIComponent(encodedPath);
          } else {
            // Fallback: try to extract from pathname
            const pathParts = url.pathname.split('/');
            filePath = pathParts.slice(pathParts.indexOf('o') + 1).join('/');
            filePath = decodeURIComponent(filePath);
          }
          
          // Delete the file from Firebase Storage
          if (filePath) {
            const fileRef = ref(storage, filePath);
            deleteObject(fileRef).catch(err => {
              console.error(`Failed to delete ${fileName} from storage:`, err);
              // Continue with form update even if storage delete fails
            });
          }
        } catch (err) {
          console.error(`Error processing ${fileName} deletion:`, err);
          // Continue with form update even if URL parsing fails
        }
      }
      
      // Update form data to remove the file
      const updated = {
        ...prev,
        [fileName]: null
      };
      
      // Also clear the URL field if it exists
      const urlFieldName = `${fileName}Url`;
      if (updated[urlFieldName]) {
        delete updated[urlFieldName];
      }
      
      return updated;
    });
  }, []);

  const handleMarketingInfoChange = useCallback((index, field, value) => {
    setMarketingInfo(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  }, []);

  const handleAddServices = useCallback(() => {
    setMarketingInfo(prev => [...prev, { services: '', potential: '' }]);
  }, []);

  const handleRemoveServices = useCallback((index) => {
    setMarketingInfo(prev => {
      if (prev.length > 1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  const handleBankDetailsChange = useCallback((index, field, value) => {
    setBankDetails(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  }, []);

  const handleAddBankDetails = useCallback(() => {
    setBankDetails(prev => [...prev, { bankName: '', branchName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }]);
  }, []);

  const handleRemoveBankDetails = useCallback((index) => {
    setBankDetails(prev => {
      if (prev.length > 1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  return {
    formData,
    setFormData,
    marketingInfo,
    bankDetails,
    loading,
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
    updateDealer,
    refetch: fetchDealerData
  };
};

export default useDealerEdit;

