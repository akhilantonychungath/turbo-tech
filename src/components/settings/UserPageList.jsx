import React, { useState, useMemo, useEffect, useRef } from 'react';
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

const UserPageList = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [deleteDialog, setDeleteDialog] = useState({ 
    isOpen: false, 
    pageId: null, 
    pageName: null
  });
  const initializedRef = useRef(false);

  const { items: userPages, loading, error, fetchItems } = useFirestoreCollection('userPages', {
    orderByField: 'pageName',
    orderDirection: 'asc'
  });

  const { filteredItems: filteredUserPages, count } = useFilteredList(userPages, {
    searchQuery,
    searchFields: ['pageName', 'pageUrl', 'description'],
    sortBy,
    sortOptions: { dateField: 'createdAt', nameField: 'pageName' }
  });

  // Expand all nodes by default - only initialize once when data first loads
  useEffect(() => {
    if (!loading && filteredUserPages && filteredUserPages.length > 0 && !initializedRef.current) {
      const allPageIds = new Set(filteredUserPages.map(page => page.id));
      setExpandedNodes(allPageIds);
      initializedRef.current = true;
    } else if (!loading && (!filteredUserPages || filteredUserPages.length === 0)) {
      // Reset when data is cleared
      initializedRef.current = false;
      setExpandedNodes(new Set());
    }
    // Only depend on loading state and data length to avoid unnecessary re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, filteredUserPages?.length]);

  // Build hierarchical structure
  const pageTree = useMemo(() => {
    if (!filteredUserPages || filteredUserPages.length === 0) return [];

    // Create a map of pages by ID
    const pageMap = new Map();
    filteredUserPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    // Build tree structure
    const roots = [];
    filteredUserPages.forEach(page => {
      const pageNode = pageMap.get(page.id);
      if (page.parentId && pageMap.has(page.parentId)) {
        const parent = pageMap.get(page.parentId);
        parent.children.push(pageNode);
      } else {
        roots.push(pageNode);
      }
    });

    return roots;
  }, [filteredUserPages]);

  const handleDeleteClick = (pageId, pageName) => {
    setDeleteDialog({ 
      isOpen: true, 
      pageId, 
      pageName
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.pageId) return;

    try {
      const pageRef = doc(db, 'userPages', deleteDialog.pageId);
      await deleteDoc(pageRef);
      fetchItems();
      setDeleteDialog({ 
        isOpen: false, 
        pageId: null, 
        pageName: null
      });
    } catch (err) {
      console.error('Error deleting user page:', err);
      setDeleteDialog({ 
        isOpen: false, 
        pageId: null, 
        pageName: null
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ 
      isOpen: false, 
      pageId: null, 
      pageName: null
    });
  };

  const toggleNode = (pageId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const renderPageNode = (page, level = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedNodes.has(page.id);
    const indent = level * 24;

    return (
      <div key={page.id} className="mb-1">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors ${hasChildren ? 'cursor-pointer' : ''}`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={hasChildren ? () => toggleNode(page.id) : undefined}
        >
          {hasChildren ? (
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(page.id);
              }}
            >
              {isExpanded ? (
                <span className="material-symbols-outlined text-sm">expand_more</span>
              ) : (
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              )}
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          )}
          
          <div className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">{page.pageName || 'No Name'}</h3>
              {page.pageUrl && (
                <p className="text-sm text-blue-600 font-medium mt-1 truncate">
                  URL: {page.pageUrl}
                </p>
              )}
              {page.description && (
                <p className="text-sm text-gray-600 mt-1 truncate">{page.description}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user-pages/edit/${page.id}`);
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(page.id, page.pageName);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">delete</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-6">
            {page.children.map(child => renderPageNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="User Pages">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">description</span>
                </div>
                <h2 className="text-2xl font-bold">User Pages</h2>
              </div>
              
              {/* Search Bar and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 lg:mx-6 w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search user pages by name, URL, or description..."
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
                onClick={() => navigate('/user-pages/add')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">add</span>
                Add User Page
              </button>
            </div>
            {searchQuery && (
              <p className="mt-4 text-sm text-white/90">
                Found {count} {count === 1 ? 'user page' : 'user pages'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* User Pages List */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <LoadingSpinner message="Loading user pages..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : filteredUserPages.length === 0 && searchQuery ? (
            <EmptyState
              icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              title="No User Pages Found"
              message={`No user pages match your search "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          ) : userPages.length === 0 ? (
            <EmptyState
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              title="No User Pages Found"
              message="No user pages have been created yet."
              actionLabel="Add First User Page"
              onAction={() => navigate('/user-pages/add')}
            />
          ) : pageTree.length === 0 ? (
            <EmptyState
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              title="No Root Pages Found"
              message="All pages have parent pages. The hierarchy structure may be incomplete."
            />
          ) : (
            <div className="space-y-2">
              {pageTree.map(rootPage => renderPageNode(rootPage))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete User Page"
        message="Are you sure you want to delete this user page?"
        itemName={deleteDialog.pageName}
      />
    </Layout>
  );
};

export default UserPageList;

