import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import LoadingSpinner from '../ui/LoadingSpinner';

const ServiceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const colorDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    serviceName: '',
    serviceIcon: '',
    indicatorColor: '',
    description: ''
  });

  // Standard color options
  const standardColors = [
    { name: 'Blue', value: '#3B82F6', hex: '#3B82F6' },
    { name: 'Green', value: '#10B981', hex: '#10B981' },
    { name: 'Red', value: '#EF4444', hex: '#EF4444' },
    { name: 'Yellow', value: '#F59E0B', hex: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6', hex: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899', hex: '#EC4899' },
    { name: 'Teal', value: '#14B8A6', hex: '#14B8A6' },
    { name: 'Orange', value: '#F97316', hex: '#F97316' },
    { name: 'Cyan', value: '#06B6D4', hex: '#06B6D4' },
    { name: 'Gray', value: '#6B7280', hex: '#6B7280' },
    { name: 'Emerald', value: '#059669', hex: '#059669' },
    { name: 'Rose', value: '#F43F5E', hex: '#F43F5E' },
    { name: 'Violet', value: '#7C3AED', hex: '#7C3AED' },
    { name: 'Amber', value: '#D97706', hex: '#D97706' }
  ];

  useEffect(() => {
    if (isEditMode) {
      fetchService();
    }
  }, [id, isEditMode]);

  // Close color dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target)) {
        setShowColorDropdown(false);
      }
    };

    if (showColorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorDropdown]);

  const fetchService = async () => {
    try {
      setFetching(true);
      setError('');
      const serviceDocRef = doc(db, 'services', id);
      const serviceDoc = await getDoc(serviceDocRef);
      
      if (serviceDoc.exists()) {
        const serviceData = serviceDoc.data();
        setFormData({
          serviceName: serviceData.serviceName || '',
          serviceIcon: serviceData.serviceIcon || '',
          indicatorColor: serviceData.indicatorColor || '',
          description: serviceData.description || ''
        });
      } else {
        setError('Service not found');
      }
    } catch (err) {
      console.error('Error fetching service:', err);
      setError('Failed to load service data. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelect = (colorValue) => {
    setFormData(prev => ({
      ...prev,
      indicatorColor: colorValue
    }));
    setShowColorDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.serviceName.trim()) {
      setError('Service name is required');
      return;
    }

    if (!formData.serviceIcon.trim()) {
      setError('Service icon is required');
      return;
    }

    if (!formData.indicatorColor.trim()) {
      setError('Indicator color is required');
      return;
    }

    try {
      setLoading(true);
      
      if (isEditMode) {
        // Update existing service - preserve createdAt
        const serviceDocRef = doc(db, 'services', id);
        const serviceDoc = await getDoc(serviceDocRef);
        const existingData = serviceDoc.exists() ? serviceDoc.data() : {};
        
        await setDoc(serviceDocRef, {
          serviceName: formData.serviceName.trim(),
          serviceIcon: formData.serviceIcon.trim(),
          indicatorColor: formData.indicatorColor.trim(),
          description: formData.description.trim(),
          createdAt: existingData.createdAt || new Date(),
          updatedAt: new Date()
        }, { merge: true });
      } else {
        // Create new service
        await addDoc(collection(db, 'services'), {
          serviceName: formData.serviceName.trim(),
          serviceIcon: formData.serviceIcon.trim(),
          indicatorColor: formData.indicatorColor.trim(),
          description: formData.description.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/services');
      }, 2000);
    } catch (err) {
      console.error('Error saving service:', err);
      setError(`Failed to save service: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/services');
  };

  if (fetching) {
    return (
      <Layout title={isEditMode ? "Edit Service" : "Add Service"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner message="Loading..." />
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout title={isEditMode ? "Edit Service" : "Add Service"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isEditMode ? 'Service Updated!' : 'Service Created!'}
              </h3>
              <p className="text-gray-600">
                {isEditMode 
                  ? 'Service information has been updated successfully.' 
                  : 'Service has been created successfully.'}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? "Edit Service" : "Add Service"}>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">room_service</span>
                </div>
                <h2 className="text-2xl font-bold">{isEditMode ? 'Edit Service' : 'Add Service'}</h2>
              </div>
              <button
                onClick={() => navigate('/services')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to Services
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
              {/* Service Name Input */}
              <div className="md:col-span-2">
                <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="serviceName"
                  name="serviceName"
                  type="text"
                  value={formData.serviceName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter service name"
                  required
                />
              </div>

              {/* Service Icon Input */}
              <div className="md:col-span-2">
                <label htmlFor="serviceIcon" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Icon <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        id="serviceIcon"
                        name="serviceIcon"
                        type="text"
                        value={formData.serviceIcon}
                        onChange={handleChange}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                        placeholder="Type Material Symbols icon name (e.g., room_service, home, settings)"
                        required
                      />
                      
                      {/* Icon Preview */}
                      {formData.serviceIcon && (
                        <div 
                          className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center border-2 border-gray-200 shadow-md"
                          style={{ 
                            backgroundColor: formData.indicatorColor || '#3B82F6',
                            backgroundImage: formData.indicatorColor ? 'none' : 'linear-gradient(to bottom right, #3B82F6, #2563EB)'
                          }}
                        >
                          <span className="material-symbols-outlined text-white text-3xl">
                            {formData.serviceIcon.trim()}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Enter any valid Material Symbols icon name. Preview will appear on the right.
                    </p>
                    <p className="mt-1 text-xs text-blue-600">
                      <a 
                        href="https://materializecss.com/icons.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Browse Material Icons →
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Indicator Color Input */}
              <div className="md:col-span-2">
                <label htmlFor="indicatorColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Indicator Color <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <div className="flex-1 relative" ref={colorDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowColorDropdown(!showColorDropdown)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-left flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {formData.indicatorColor ? (
                          <>
                            <div className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm" style={{ backgroundColor: formData.indicatorColor }}></div>
                            <span>{standardColors.find(c => c.value === formData.indicatorColor)?.name || 'Selected'}</span>
                          </>
                        ) : (
                          <span className="text-gray-500">Select a color</span>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-gray-500">
                        {showColorDropdown ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    
                    {/* Color Dropdown with Previews */}
                    {showColorDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                        <div className="p-2">
                          {standardColors.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => handleColorSelect(color.value)}
                              onMouseDown={(e) => e.preventDefault()}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-gray-50 ${
                                formData.indicatorColor === color.value ? 'bg-blue-50 border-2 border-blue-500' : 'border-2 border-transparent'
                              }`}
                            >
                              <div 
                                className="w-8 h-8 rounded-full border-2 border-gray-300 shadow-sm flex-shrink-0" 
                                style={{ backgroundColor: color.value }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700">{color.name}</span>
                              {formData.indicatorColor === color.value && (
                                <span className="material-symbols-outlined text-blue-600 ml-auto">check</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Select a color for the service indicator. Preview will appear on the right.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description Input */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Enter service description"
                />
              </div>
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
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Service' : 'Create Service'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ServiceForm;

