import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../common/Layout';
import LoadingSpinner from '../ui/LoadingSpinner';
import FileUpload from '../dealer/FileUpload';
import CustomSelect from '../common/CustomSelect';

// Engine Type Options
const ENGINE_TYPES = [
  { value: 'Petrol', label: 'Petrol' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Electric', label: 'Electric' },
  { value: 'CNG', label: 'CNG' },
  { value: 'LPG', label: 'LPG' }
];

// Transmission Type Options
const TRANSMISSION_TYPES = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Automatic', label: 'Automatic' }
];

const BrandForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    brandLogo: null
  });
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [models, setModels] = useState([
    { modelName: '', year: '', variant: '', engineType: '', engineCapacity: '', transmissionType: '', isSaved: false }
  ]);
  const [editingModelIndex, setEditingModelIndex] = useState(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchBrand();
    }
  }, [id, isEditMode]);

  const fetchBrand = async () => {
    try {
      setFetching(true);
      setError('');
      const brandDocRef = doc(db, 'brands', id);
      const brandDoc = await getDoc(brandDocRef);
      
      if (brandDoc.exists()) {
        const brandData = brandDoc.data();
        setFormData({
          brandName: brandData.brandName || '',
          brandLogo: brandData.brandLogo || null
        });
        if (brandData.brandLogo) {
          setExistingLogoUrl(brandData.brandLogo);
        }
        setLogoRemoved(false); // Reset removal flag when loading brand
        // Load models if they exist
        if (brandData.models && Array.isArray(brandData.models) && brandData.models.length > 0) {
          // Mark all loaded models as saved
          const savedModels = brandData.models.map(model => ({
            ...model,
            isSaved: true
          }));
          setModels(savedModels);
        } else {
          setModels([{ modelName: '', year: '', variant: '', engineType: '', engineCapacity: '', transmissionType: '', isSaved: false }]);
        }
      } else {
        setError('Brand not found');
      }
    } catch (err) {
      console.error('Error fetching brand:', err);
      setError('Failed to load brand data. Please try again.');
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

  const handleLogoChange = (e) => {
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
      setLogoFile(file);
      setLogoRemoved(false); // Reset removal flag when new file is selected
      setFormData(prev => ({
        ...prev,
        brandLogo: file
      }));
      setError('');
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setFormData(prev => ({
      ...prev,
      brandLogo: null
    }));
    // If in edit mode and there was an existing logo, mark it for deletion
    if (existingLogoUrl) {
      setLogoRemoved(true);
    }
  };

  const uploadLogo = async (file) => {
    if (!file) return null;
    
    try {
      const fileName = `brand-logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
      const path = `brands/${currentUser?.uid || 'anon'}/${fileName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error('Error uploading logo:', err);
      throw new Error('Failed to upload brand logo');
    }
  };

  const deleteOldLogo = async (logoUrl) => {
    if (!logoUrl) return;
    
    try {
      // Extract the file path from the download URL
      const url = new URL(logoUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (err) {
      console.error('Error deleting old logo:', err);
      // Don't throw - it's okay if old logo deletion fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.brandName.trim()) {
      setError('Brand name is required');
      return;
    }

    try {
      setLoading(true);
      
      let logoUrl = existingLogoUrl;
      
      // Upload new logo if a file was selected
      if (logoFile) {
        // Delete old logo if it exists
        if (existingLogoUrl) {
          await deleteOldLogo(existingLogoUrl);
        }
        // Upload new logo
        logoUrl = await uploadLogo(logoFile);
      } else if (logoRemoved && existingLogoUrl) {
        // If logo was explicitly removed in edit mode, delete the old one
        await deleteOldLogo(existingLogoUrl);
        logoUrl = null;
      }
      
      if (isEditMode) {
        // Update existing brand - preserve createdAt
        const brandDocRef = doc(db, 'brands', id);
        const brandDoc = await getDoc(brandDocRef);
        const existingData = brandDoc.exists() ? brandDoc.data() : {};
        
        // Only save models that have been individually saved, remove isSaved flag
        const modelsToSave = models
          .filter(model => model.isSaved)
          .map(({ isSaved, ...model }) => model);
        
        await setDoc(brandDocRef, {
          brandName: formData.brandName.trim(),
          brandLogo: logoUrl,
          models: modelsToSave,
          createdAt: existingData.createdAt || new Date(),
          updatedAt: new Date()
        }, { merge: true });
      } else {
        // Only save models that have been individually saved, remove isSaved flag
        const modelsToSave = models
          .filter(model => model.isSaved)
          .map(({ isSaved, ...model }) => model);
        
        // Create new brand
        await addDoc(collection(db, 'brands'), {
          brandName: formData.brandName.trim(),
          brandLogo: logoUrl,
          models: modelsToSave,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/brands');
      }, 2000);
    } catch (err) {
      console.error('Error saving brand:', err);
      setError(`Failed to save brand: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/brands');
  };

  const handleModelChange = (index, field, value) => {
    setModels(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleAddModel = () => {
    const newIndex = models.length;
    setModels(prev => [...prev, { modelName: '', year: '', variant: '', engineType: '', engineCapacity: '', transmissionType: '', isSaved: false }]);
    setEditingModelIndex(newIndex); // Set the new model as editing
  };

  const handleRemoveModel = (index) => {
    if (models.length > 1) {
      setModels(prev => prev.filter((_, i) => i !== index));
      if (editingModelIndex === index) {
        setEditingModelIndex(null);
      } else if (editingModelIndex > index) {
        setEditingModelIndex(editingModelIndex - 1);
      }
    }
  };

  const handleSaveModel = (index) => {
    const model = models[index];
    
    // Validate required fields (only modelName, year, and variant are required)
    if (!model.modelName.trim() || !model.year.trim() || !model.variant.trim()) {
      setError('Please fill all required fields for the model (Model Name, Year, and Variant)');
      return;
    }

    // Mark model as saved
    setModels(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isSaved: true
      };
      return updated;
    });
    setEditingModelIndex(null);
    setError('');
  };

  const handleEditModel = (index) => {
    setEditingModelIndex(index);
  };

  const handleCancelEditModel = (index) => {
    // If it's a new unsaved model, remove it
    if (!models[index].isSaved) {
      if (models.length > 1) {
        handleRemoveModel(index);
      } else {
        // Reset to empty if it's the only model
        setModels([{ modelName: '', year: '', variant: '', engineType: '', engineCapacity: '', horsepower: '', cylinders: '', transmissionType: '', isSaved: false }]);
      }
    }
    setEditingModelIndex(null);
  };

  if (fetching) {
    return (
      <Layout title={isEditMode ? "Edit Brand" : "Add Brand"}>
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
      <Layout title={isEditMode ? "Edit Brand" : "Add Brand"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isEditMode ? 'Brand Updated!' : 'Brand Created!'}
              </h3>
              <p className="text-gray-600">
                {isEditMode 
                  ? 'Brand information has been updated successfully.' 
                  : 'Brand has been created successfully.'}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? "Edit Brand" : "Add Brand"}>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">branding_watermark</span>
                </div>
                <h2 className="text-2xl font-bold">{isEditMode ? 'Edit Brand' : 'Add Brand'}</h2>
              </div>
              <button
                onClick={() => navigate('/brands')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to Brands
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
              {/* Brand Name Input */}
              <div className="md:col-span-2">
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="brandName"
                  name="brandName"
                  type="text"
                  value={formData.brandName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter brand name"
                  required
                />
              </div>

              {/* Brand Logo Upload */}
              <div className="md:col-span-2">
                <FileUpload
                  name="brandLogo"
                  label="Brand Logo"
                  value={logoFile || existingLogoUrl}
                  onChange={handleLogoChange}
                  onRemove={handleRemoveLogo}
                  accept="image/*"
                  required={false}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Upload a logo image for the brand. Supported formats: JPG, PNG, GIF. Max size: 5MB.
                </p>
              </div>

              {/* Models Section */}
              <div className="md:col-span-2 mt-4">
                <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex-shrink-0">Models</h3>
                  
                  <div className="flex items-center gap-4 flex-1">
                    {/* Search Bar for Models */}
                    {models.some((m, i) => m.isSaved && editingModelIndex !== i) && (
                      <div className="flex-1 min-w-0 max-w-md">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white outline-none"
                            placeholder="Search models by name, year, or variant..."
                          />
                          {modelSearchQuery && (
                            <button
                              onClick={() => setModelSearchQuery('')}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={handleAddModel}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm flex-shrink-0 ml-auto"
                    >
                      <span className="material-symbols-outlined text-base leading-none inline-flex items-center">add</span>
                      <span>Add Model</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Saved Models Grid - 2 per row on large screens */}
              {models.some((m, i) => m.isSaved && editingModelIndex !== i) && (() => {
                // Filter saved models based on search query
                const savedModels = models
                  .map((model, index) => ({ model, index }))
                  .filter(({ model, index }) => {
                    const isEditing = editingModelIndex === index;
                    const isSaved = model.isSaved && !isEditing;
                    if (!isSaved) return false;
                    
                    if (!modelSearchQuery.trim()) return true;
                    
                    const query = modelSearchQuery.toLowerCase();
                    return (
                      (model.modelName || '').toLowerCase().includes(query) ||
                      (model.year || '').toLowerCase().includes(query) ||
                      (model.variant || '').toLowerCase().includes(query)
                    );
                  });

                if (savedModels.length === 0 && modelSearchQuery) {
                  return (
                    <div className="md:col-span-2 text-center py-8">
                      <p className="text-gray-500">No models found matching "{modelSearchQuery}"</p>
                    </div>
                  );
                }

                return (
                  <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {savedModels.map(({ model, index }) => {
                      return (
                        <div key={index}>
                          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow h-full">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-col gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-500">Model Name</p>
                                    <p className="text-lg font-semibold text-gray-900">{model.modelName || 'N/A'}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Year</p>
                                      <p className="text-base font-semibold text-gray-900">{model.year || 'N/A'}</p>
                                    </div>
                                    <div className="h-8 w-px bg-gray-300"></div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-500">Variant</p>
                                      <p className="text-base font-semibold text-gray-900">{model.variant || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditModel(index)}
                                  className="w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-lg leading-none inline-flex items-center">edit</span>
                                </button>
                                {models.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveModel(index)}
                                    className="w-10 h-10 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                                    title="Delete"
                                  >
                                    <span className="material-symbols-outlined text-lg leading-none inline-flex items-center">delete</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Editing and New Models */}
              {models.map((model, index) => {
                const isEditing = editingModelIndex === index;
                const isSaved = model.isSaved && !isEditing;

                // Skip saved models here (they're rendered above)
                if (isSaved) {
                  return null;
                }

                // Show full form for editing or new models
                return (
                  <div key={index} className="md:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={model.modelName}
                            onChange={(e) => handleModelChange(index, 'modelName', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter model name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Year <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={model.year}
                            onChange={(e) => handleModelChange(index, 'year', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter year"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Variant <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={model.variant}
                            onChange={(e) => handleModelChange(index, 'variant', e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter variant"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Engine Type
                          </label>
                          <CustomSelect
                            value={model.engineType}
                            onChange={(e) => handleModelChange(index, 'engineType', e.target.value)}
                            placeholder="Select engine type"
                            name={`engineType-${index}`}
                            options={ENGINE_TYPES}
                            showRoleChip={false}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Engine Capacity
                          </label>
                          <input
                            type="text"
                            value={model.engineCapacity}
                            onChange={(e) => handleModelChange(index, 'engineCapacity', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter engine capacity"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transmission Type
                          </label>
                          <CustomSelect
                            value={model.transmissionType}
                            onChange={(e) => handleModelChange(index, 'transmissionType', e.target.value)}
                            placeholder="Select transmission type"
                            name={`transmissionType-${index}`}
                            options={TRANSMISSION_TYPES}
                            showRoleChip={false}
                          />
                        </div>

                        <div className="md:col-span-2 flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveModel(index)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <span className="material-symbols-outlined text-base leading-none inline-flex items-center">save</span>
                            <span>Save</span>
                          </button>
                          {model.isSaved && (
                            <button
                              type="button"
                              onClick={() => handleCancelEditModel(index)}
                              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                            >
                              <span>Cancel</span>
                            </button>
                          )}
                          {!model.isSaved && models.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveModel(index)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                            >
                              <span className="material-symbols-outlined text-base leading-none inline-flex items-center">delete</span>
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  isEditMode ? 'Update Brand' : 'Create Brand'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default BrandForm;

