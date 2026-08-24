import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

const UserRoleList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, userRoleId: null, userRoleName: null });
  const [deleteError, setDeleteError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { items: userRoles, loading, error, fetchItems } = useFirestoreCollection('userRoles', {
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  const { items: userPages } = useFirestoreCollection('userPages', {
    orderByField: 'pageName',
    orderDirection: 'asc',
    autoFetch: true
  });

  // Enrich user roles with parent role names, landing page, and granted pages
  const [enrichedRoles, setEnrichedRoles] = useState([]);

  useEffect(() => {
    const enrichRoles = async () => {
      const enriched = await Promise.all(
        userRoles.map(async (role) => {
          let enrichedRole = { ...role };

          // Fetch parent role name
          if (role.parentRoleId) {
            try {
              const parentRoleDocRef = doc(db, 'userRoles', role.parentRoleId);
              const parentRoleDoc = await getDoc(parentRoleDocRef);
              if (parentRoleDoc.exists()) {
                enrichedRole.parentRoleName = parentRoleDoc.data().roleName;
              }
            } catch (err) {
              console.error('Error fetching parent role:', err);
            }
          }

          // Find landing page name
          if (role.landingPage && userPages.length > 0) {
            const landingPage = userPages.find(page => page.pageUrl === role.landingPage);
            if (landingPage) {
              enrichedRole.landingPageName = landingPage.pageName;
            }
          }

          // Find granted pages names
          if (role.grantedPages && role.grantedPages.length > 0 && userPages.length > 0) {
            enrichedRole.grantedPagesNames = userPages
              .filter(page => role.grantedPages.includes(page.id))
              .map(page => ({ id: page.id, name: page.pageName, url: page.pageUrl }));
          }

          return enrichedRole;
        })
      );
      setEnrichedRoles(enriched);
    };

    if (userRoles.length > 0) {
      enrichRoles();
    } else {
      setEnrichedRoles([]);
    }
  }, [userRoles, userPages]);

  const { filteredItems: filteredUserRoles, count } = useFilteredList(enrichedRoles, {
    searchQuery,
    searchFields: ['roleName', 'description', 'parentRoleName'],
    sortBy,
    sortOptions: { dateField: 'createdAt', nameField: 'roleName' }
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUserRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUserRoles = useMemo(() => {
    return filteredUserRoles.slice(startIndex, endIndex);
  }, [filteredUserRoles, startIndex, endIndex]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of user role list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredUserRoles.length)} of {filteredUserRoles.length} user roles
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          
          <div className="flex items-center gap-1">
            {(() => {
              const pages = [];
              const showEllipsis = totalPages > 7;
              
              if (!showEllipsis) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);
                
                if (currentPage <= 4) {
                  // Show pages 1-5, then ellipsis, then last
                  for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  // Show first, ellipsis, then last 5 pages
                  pages.push('ellipsis-start');
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // Show first, ellipsis, current-1, current, current+1, ellipsis, last
                  pages.push('ellipsis-start');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
              }
              
              return pages.map((page, index) => {
                if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              });
            })()}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    );
  };

  const handleDeleteClick = async (userRoleId, userRoleName) => {
    setDeleteError('');
    
    // Check if any users are using this role
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('userRoleId', '==', userRoleId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userCount = usersSnapshot.size;
        setDeleteError(
          `Cannot delete this role. It is currently assigned to ${userCount} ${userCount === 1 ? 'user' : 'users'}. Please reassign or remove the users first.`
        );
        setDeleteDialog({ isOpen: true, userRoleId, userRoleName });
        return;
      }
      
      // No users using this role, proceed with delete dialog
      setDeleteDialog({ isOpen: true, userRoleId, userRoleName });
    } catch (err) {
      console.error('Error checking users for role:', err);
      setDeleteError('Error checking if role is in use. Please try again.');
      setDeleteDialog({ isOpen: true, userRoleId, userRoleName });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.userRoleId) return;

    // Double-check before deleting (in case something changed)
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('userRoleId', '==', deleteDialog.userRoleId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userCount = usersSnapshot.size;
        setDeleteError(
          `Cannot delete this role. It is currently assigned to ${userCount} ${userCount === 1 ? 'user' : 'users'}. Please reassign or remove the users first.`
        );
        return;
      }

      // Safe to delete
      const userRoleRef = doc(db, 'userRoles', deleteDialog.userRoleId);
      await deleteDoc(userRoleRef);
      fetchItems();
      setDeleteDialog({ isOpen: false, userRoleId: null, userRoleName: null });
      setDeleteError('');
    } catch (err) {
      console.error('Error deleting user role:', err);
      setDeleteError('Failed to delete user role. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, userRoleId: null, userRoleName: null });
    setDeleteError('');
  };

  return (
    <Layout title="User Roles">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">admin_panel_settings</span>
                </div>
                <h2 className="text-2xl font-bold">User Roles</h2>
              </div>
              
              {/* Search Bar and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 lg:mx-6 w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search user roles by name, description, or parent role..."
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
                onClick={() => navigate('/user-roles/add')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add User Role
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {count} {count === 1 ? 'user role' : 'user roles'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* User Roles List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <LoadingSpinner message="Loading user roles..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredUserRoles.length === 0 && searchQuery ? (
            <EmptyState
              icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              title="No User Roles Found"
              message={`No user roles match your search "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          ) : userRoles.length === 0 ? (
            <EmptyState
              icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              title="No User Roles Found"
              message="No user roles have been created yet."
              actionLabel="Add First User Role"
              onAction={() => navigate('/user-roles/add')}
            />
          ) : (
            <>
              {/* Pagination Controls - Top */}
              <PaginationControls />
              
              <div className="space-y-4">
                {paginatedUserRoles.map((userRole) => (
                <div
                  key={userRole.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-gray-200">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{userRole.roleName || 'No Name'}</h3>
                          {userRole.parentRoleName && (
                            <p className="text-sm text-blue-600 font-medium mt-1">
                              Parent Role: {userRole.parentRoleName}
                            </p>
                          )}
                          {!userRole.parentRoleId && (
                            <p className="text-sm text-gray-500 font-medium mt-1">
                              Root Role (No Parent)
                            </p>
                          )}
                          {userRole.description && (
                            <p className="text-sm text-gray-600 mt-1">{userRole.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Granted Pages */}
                      {userRole.grantedPagesNames && userRole.grantedPagesNames.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <span className="text-gray-600 font-medium text-sm">Granted Access ({userRole.grantedPagesNames.length}):</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {userRole.grantedPagesNames.map((page) => (
                              <span
                                key={page.id}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {page.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Landing Page */}
                      {userRole.landingPageName && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <span className="text-gray-600 font-medium text-sm">Landing Page:</span>
                          <p className="text-gray-900 font-medium mt-1">
                            {userRole.landingPageName}
                            <span className="text-gray-500 text-xs ml-2">({userRole.landingPage})</span>
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/user-roles/edit/${userRole.id}`)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(userRole.id, userRole.roleName)}
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

              {/* Pagination Controls - Bottom */}
              <PaginationControls />
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete User Role"
        message={deleteError ? deleteError : "Are you sure you want to delete this user role?"}
        itemName={deleteDialog.userRoleName}
        canDelete={!deleteError}
        warningMessage={deleteError ? undefined : "This action cannot be undone."}
      />
    </Layout>
  );
};

export default UserRoleList;
