import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const useCompanyEdit = (companyId) => {
  const [formData, setFormData] = useState({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    website: '',
    industry: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchCompanyData = useCallback(async () => {
    if (!companyId) {
      setFetching(false);
      return;
    }

    try {
      setFetching(true);
      setError('');
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        const data = companySnap.data();
        setFormData({
          companyName: data.companyName || '',
          registrationNumber: data.registrationNumber || '',
          taxId: data.taxId || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          country: data.country || '',
          website: data.website || '',
          industry: data.industry || '',
          description: data.description || ''
        });
      } else {
        setError('Company not found');
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Failed to load company data. Please try again.');
    } finally {
      setFetching(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const updateCompany = useCallback(async (updatedData, currentUser) => {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    setLoading(true);
    setError('');

    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        ...updatedData,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid || '',
        updatedByEmail: currentUser?.email || ''
      });
      return true;
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Failed to update company. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  return {
    formData,
    loading,
    fetching,
    error,
    setError,
    handleChange,
    updateCompany,
    refetch: fetchCompanyData
  };
};

export default useCompanyEdit;

