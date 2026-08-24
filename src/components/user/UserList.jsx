import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { useFilteredList } from '../../hooks/useFilteredList';
import { formatDate } from '../../utils/dateUtils';
import { generateTransactionId } from '../../utils/idUtils';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import SearchBar from '../ui/SearchBar';
import StatusBadge from '../ui/StatusBadge';

// Helper function to get profile picture URL from profile-pictures storage
// Returns the profilePicUrl if it exists, otherwise returns null
const getProfilePictureUrl = (user) => {
  if (user.profilePicUrl) {
    // If URL contains old directory path, it will still work as Firebase Storage URLs are permanent
    // New uploads use profile-pictures directory
    return user.profilePicUrl;
  }
  return null;
};

const UserList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [roleNameFilter, setRoleNameFilter] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { items: users, loading, error, setError, fetchItems } = useFirestoreCollection('users', {
    orderByField: 'createdAt',
    orderDirection: 'desc'
  });

  const { filteredItems: filteredUsers, count } = useFilteredList(users, {
    searchQuery,
    searchFields: ['name', 'email', 'roleName'],
    sortBy,
    sortOptions: { dateField: 'createdAt', nameField: 'name' },
    fieldFilters: { roleName: roleNameFilter }
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, roleNameFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, startIndex, endIndex]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of user list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination component
  const PaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
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

  const handleApprove = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const transactionId = generateTransactionId();
      await updateDoc(userRef, {
        status: 'approved',
        isBlocked: false,
        transactionId: transactionId,
        updatedAt: new Date()
      });
      fetchItems();
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Failed to approve user. Please try again.');
    }
  };

  const handleBlock = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'blocked',
        isBlocked: true,
        updatedAt: new Date()
      });
      fetchItems();
    } catch (err) {
      console.error('Error blocking user:', err);
      setError('Failed to block user. Please try again.');
    }
  };

  const handleCopyTransactionId = async (transactionId, userId) => {
    try {
      await navigator.clipboard.writeText(transactionId);
      setCopiedId(userId);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error('Error copying transaction ID:', err);
      setError('Failed to copy transaction ID. Please try again.');
    }
  };

  const uniqueRoles = [...new Set(users.map(user => user.roleName).filter(Boolean))].sort();

  return (
    <Layout title="User List">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">people</span>
                </div>
                <h2 className="text-2xl font-bold">Users</h2>
              </div>
              
              {/* Search Bar and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 lg:mx-6 w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search users by name, email, or role..."
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

                {/* User Role Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                  <label className="text-sm font-medium text-white whitespace-nowrap">User Role:</label>
                  <div className="flex-1 sm:flex-initial min-w-[150px]">
                    <CustomSelect
                      name="roleNameFilter"
                      value={roleNameFilter}
                      onChange={(e) => setRoleNameFilter(e.target.value)}
                      placeholder="All Roles"
                      options={[
                        { value: '', label: 'All Roles' },
                        ...uniqueRoles.map((roleName) => ({
                          value: roleName,
                          label: roleName
                        }))
                      ]}
                      showRoleChip={false}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/users/add')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add User
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {count} {count === 1 ? 'user' : 'users'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <LoadingSpinner message="Loading users..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredUsers.length === 0 && searchQuery ? (
            <EmptyState
              icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              title="No Users Found"
              message={`No users match your search "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          ) : users.length === 0 ? (
            <EmptyState
              icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              title="No Users Found"
              message="No users have been registered yet."
              actionLabel="Add First User"
              onAction={() => navigate('/users/add')}
            />
          ) : (
            <>
              {/* Pagination Controls - Top */}
              <PaginationControls />
              
              <div className="space-y-4">
                {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {getProfilePictureUrl(user) ? (
                            <img
                              src={getProfilePictureUrl(user)}
                              alt={user.name || 'User'}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-gray-200">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{user.name || 'No Name'}</h3>
                            <p className="text-sm text-gray-600">{user.email || 'No Email'}</p>
                          </div>
                        </div>
                        <StatusBadge status={user.status} isBlocked={user.isBlocked} />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 font-medium">User Role:</span>
                          <p className="text-gray-900">{user.roleName || 'Not set'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Created At:</span>
                          <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                        </div>
                        {user.updatedAt && (
                          <div>
                            <span className="text-gray-600 font-medium">Last Updated:</span>
                            <p className="text-gray-900">{formatDate(user.updatedAt)}</p>
                          </div>
                        )}
                        {user.transactionId && (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gray-600 font-medium">Transaction ID:</span>
                              <button
                                onClick={() => handleCopyTransactionId(user.transactionId, user.id)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 group"
                                title="Copy transaction ID"
                              >
                                {copiedId === user.id ? (
                                  <span className="material-symbols-outlined text-sm text-green-600">check</span>
                                ) : (
                                  <span className="material-symbols-outlined text-sm text-gray-500 group-hover:text-gray-700">content_copy</span>
                                )}
                              </button>
                            </div>
                            <p className="text-gray-900 font-mono text-xs break-all">{user.transactionId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/users/edit/${user.id}`)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={user.status === 'approved' && !user.isBlocked}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          user.status === 'approved' && !user.isBlocked
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        {user.status === 'blocked' || user.isBlocked ? 'Unblock' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleBlock(user.id)}
                        disabled={user.status === 'blocked' || user.isBlocked}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          user.status === 'blocked' || user.isBlocked
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg'
                        }`}
                      >
                        Block
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
    </Layout>
  );
};

export default UserList;
