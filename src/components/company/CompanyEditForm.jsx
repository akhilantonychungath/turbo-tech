import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyEdit } from '../../hooks';
import Layout from '../common/Layout';
import { Button, Input, Textarea, ErrorMessage, LoadingSpinner } from '../ui';

// Form field configurations
const FORM_FIELDS = [
  { 
    name: 'companyName', 
    label: 'Company Name', 
    type: 'text', 
    required: true, 
    span: 2,
    placeholder: 'Enter company name'
  },
  { 
    name: 'registrationNumber', 
    label: 'Registration Number', 
    type: 'text', 
    required: true,
    placeholder: 'Enter registration number'
  },
  { 
    name: 'taxId', 
    label: 'Tax ID / GST Number', 
    type: 'text', 
    required: false,
    placeholder: 'Enter tax ID'
  },
  { 
    name: 'email', 
    label: 'Company Email', 
    type: 'email', 
    required: true,
    placeholder: 'company@example.com'
  },
  { 
    name: 'phone', 
    label: 'Phone Number', 
    type: 'tel', 
    required: true,
    placeholder: '+91 98765 43210'
  },
  { 
    name: 'address', 
    label: 'Address', 
    type: 'text', 
    required: true, 
    span: 2,
    placeholder: 'Street address'
  },
  { 
    name: 'city', 
    label: 'City', 
    type: 'text', 
    required: true,
    placeholder: 'Enter city'
  },
  { 
    name: 'state', 
    label: 'State/Province', 
    type: 'text', 
    required: true,
    placeholder: 'Enter state'
  },
  { 
    name: 'zipCode', 
    label: 'Zip/Postal Code', 
    type: 'text', 
    required: true,
    placeholder: 'Enter zip code'
  },
  { 
    name: 'country', 
    label: 'Country', 
    type: 'text', 
    required: true,
    placeholder: 'Enter country'
  },
  { 
    name: 'website', 
    label: 'Website', 
    type: 'url', 
    required: false,
    placeholder: 'https://www.example.com'
  },
  { 
    name: 'industry', 
    label: 'Industry', 
    type: 'text', 
    required: false,
    placeholder: 'e.g., Technology, Finance, Retail'
  },
];

const CompanyEditForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { formData, loading, fetching, error, setError, handleChange, updateCompany } = useCompanyEdit(id);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    try {
      await updateCompany(formData, currentUser);
      setSuccess(true);
      setTimeout(() => {
        navigate('/companies');
      }, 2000);
    } catch (err) {
      // Error is already handled in the hook
    }
  }, [formData, currentUser, updateCompany, navigate, setError]);

  const handleCancel = useCallback(() => {
    navigate('/companies');
  }, [navigate]);

  if (fetching) {
    return (
      <Layout title="Edit Company">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner message="Loading company data..." />
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title="Edit Company">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Company Updated!</h3>
              <p className="text-gray-600">Company information has been updated successfully.</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Edit Company">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">business</span>
                </div>
                <h2 className="text-2xl font-bold">Edit Company</h2>
              </div>
              <button
                onClick={() => navigate('/companies')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to Company List
              </button>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl">
          <form onSubmit={handleSubmit} className="p-6">
            <ErrorMessage message={error} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FORM_FIELDS.map((field) => (
                <div key={field.name} className={field.span === 2 ? 'md:col-span-2' : ''}>
                  <Input
                    label={field.label}
                    name={field.name}
                    type={field.type}
                    value={formData[field.name]}
                    onChange={handleChange}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              {/* Description Textarea */}
              <div className="md:col-span-2">
                <Textarea
                  label="Company Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Brief description of your company..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-4 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
              >
                Update Company
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CompanyEditForm;
