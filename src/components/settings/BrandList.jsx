import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import DeleteConfirmationDialog from '../ui/DeleteConfirmationDialog';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { useFilteredList } from '../../hooks/useFilteredList';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import SearchBar from '../ui/SearchBar';

const BrandList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    brandId: null, 
    brandName: null
  });

  const { items: brands, loading, error, fetchItems } = useFirestoreCollection('brands', {
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  const { filteredItems: filteredBrands, count } = useFilteredList(brands, {
    searchQuery,
    searchFields: ['brandName', 'description'],
    sortBy,
    sortOptions: { dateField: 'createdAt', nameField: 'brandName' }
  });

  const handleDeleteClick = (brandId, brandName) => {
    setDeleteDialog({ 
      isOpen: true, 
      brandId, 
      brandName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.brandId) return;

    try {
      const brandRef = doc(db, 'brands', deleteDialog.brandId);
      await deleteDoc(brandRef);
      fetchItems();
      setDeleteDialog({ 
        isOpen: false, 
        brandId: null, 
        brandName: null
      });
    } catch (err) {
      console.error('Error deleting brand:', err);
      setDeleteDialog({ 
        isOpen: false, 
        brandId: null, 
        brandName: null
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ 
      isOpen: false, 
      brandId: null, 
      brandName: null
    });
  };

  return (
    <Layout title="Brands">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">branding_watermark</span>
                </div>
                <h2 className="text-2xl font-bold">Brands</h2>
              </div>
              
              {/* Search Bar and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 lg:mx-6 w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search brands by name or description..."
                />

                {/* Sort Option */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                  <label className="text-sm font-medium text-white whitespace-nowrap">Sort by:</label>
                  <div className="flex-1 sm:flex-initial min-w-[180px]">
                    <CustomSelect
                      name="sortBy"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      placeholder="Select sort option"
                      options={[
                        { value: 'newest', label: 'Newest First' },
                        { value: 'oldest', label: 'Oldest First' },
                        { value: 'name-asc', label: 'Name (A-Z)' },
                        { value: 'name-desc', label: 'Name (Z-A)' }
                      ]}
                      showRoleChip={false}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/brands/add')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Brand
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {count} {count === 1 ? 'brand' : 'brands'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Brands List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <LoadingSpinner message="Loading brands..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredBrands.length === 0 && searchQuery ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-6xl text-gray-400 block">branding_watermark</span>}
              title="No Brands Found"
              message={`No brands match your search "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          ) : brands.length === 0 ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-6xl text-gray-400 block">branding_watermark</span>}
              title="No Brands Found"
              message="No brands have been created yet."
              actionLabel="Add First Brand"
              onAction={() => navigate('/brands/add')}
            />
          ) : (
            <div className="space-y-4">
              {filteredBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {brand.brandLogo ? (
                          <div className="w-16 h-16 rounded-lg flex items-center justify-center border-2 border-gray-200 overflow-hidden bg-white flex-shrink-0">
                            <img 
                              src={brand.brandLogo} 
                              alt={brand.brandName || 'Brand Logo'} 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center hidden">
                              <span className="material-symbols-outlined text-gray-400 text-2xl">
                                branding_watermark
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg flex items-center justify-center border-2 border-gray-200 bg-gray-100 flex-shrink-0">
                            <span className="material-symbols-outlined text-gray-400 text-2xl">
                              branding_watermark
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{brand.brandName || 'No Name'}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-600">
                              {brand.models && Array.isArray(brand.models) ? (
                                <>
                                  <span className="font-semibold text-gray-900">{brand.models.length}</span>
                                  {' '}
                                  {brand.models.length === 1 ? 'Model' : 'Models'}
                                </>
                              ) : (
                                <span className="text-gray-500">0 Models</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/brands/edit/${brand.id}`)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(brand.id, brand.brandName)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Brand"
        message="Are you sure you want to delete this brand?"
        itemName={deleteDialog.brandName}
      />
    </Layout>
  );
};

export default BrandList;

