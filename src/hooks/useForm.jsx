import { useState } from 'react';

const useForm = (initialValues = {}) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const setValue = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const reset = () => {
    setFormData(initialValues);
    setErrors({});
    setLoading(false);
  };

  const setError = (field, message) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }));
  };

  return {
    formData,
    errors,
    loading,
    setLoading,
    handleChange,
    setValue,
    reset,
    setError,
    setErrors
  };
};

export default useForm;

