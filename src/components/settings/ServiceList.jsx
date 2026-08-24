import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import DeleteConfirmationDialog from '../ui/DeleteConfirmationDialog';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { useFilteredList } from '../../hooks/useFilteredList';
import { formatDate } from '../../utils/dateUtils';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import SearchBar from '../ui/SearchBar';

const ServiceList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    serviceId: null, 
    serviceName: null
  });

  const { items: services, loading, error, fetchItems } = useFirestoreCollection('services', {
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  const { filteredItems: filteredServices, count } = useFilteredList(services, {
    searchQuery,
    searchFields: ['serviceName', 'description'],
    sortBy,
    sortOptions: { dateField: 'createdAt', nameField: 'serviceName' }
  });

  const handleDeleteClick = (serviceId, serviceName) => {
    setDeleteDialog({ 
      isOpen: true, 
      serviceId, 
      serviceName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.serviceId) return;

    try {
      const serviceRef = doc(db, 'services', deleteDialog.serviceId);
      await deleteDoc(serviceRef);
      fetchItems();
      setDeleteDialog({ 
        isOpen: false, 
        serviceId: null, 
        serviceName: null
      });
    } catch (err) {
      console.error('Error deleting service:', err);
      setDeleteDialog({ 
        isOpen: false, 
        serviceId: null, 
        serviceName: null
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ 
      isOpen: false, 
      serviceId: null, 
      serviceName: null
    });
  };

  return (
    <Layout title="Services">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">room_service</span>
                </div>
                <h2 className="text-2xl font-bold">Services</h2>
              </div>
              
              {/* Search Bar and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 lg:mx-6 w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search services by name or description..."
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
                onClick={() => navigate('/services/add')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add Service
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {count} {count === 1 ? 'service' : 'services'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <LoadingSpinner message="Loading services..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredServices.length === 0 && searchQuery ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-6xl text-gray-400 block">room_service</span>}
              title="No Services Found"
              message={`No services match your search "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          ) : services.length === 0 ? (
            <EmptyState
              icon={<span className="material-symbols-outlined text-6xl text-gray-400 block">room_service</span>}
              title="No Services Found"
              message="No services have been created yet."
              actionLabel="Add First Service"
              onAction={() => navigate('/services/add')}
            />
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200"
                          style={{ 
                            backgroundColor: service.indicatorColor || '#3B82F6',
                            backgroundImage: service.indicatorColor ? 'none' : 'linear-gradient(to bottom right, #3B82F6, #2563EB)'
                          }}
                        >
                          <span className="material-symbols-outlined text-white text-2xl">
                            {service.serviceIcon || 'room_service'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{service.serviceName || 'No Name'}</h3>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/services/edit/${service.id}`)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(service.id, service.serviceName)}
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
        title="Delete Service"
        message="Are you sure you want to delete this service?"
        itemName={deleteDialog.serviceName}
      />
    </Layout>
  );
};

export default ServiceList;

