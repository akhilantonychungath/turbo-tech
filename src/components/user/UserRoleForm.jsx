import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Layout from '../common/Layout';
import CustomSelect from '../common/CustomSelect';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import LoadingSpinner from '../ui/LoadingSpinner';

const UserRoleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [expandedPages, setExpandedPages] = useState(new Set());
  const initializedRef = useRef(false);
  const [formData, setFormData] = useState({
    roleName: '',
    parentRoleId: '',
    description: '',
    landingPage: 'profile',
    grantedPages: [],
    userType: 'inside' // 'inside' or 'outside'
  });

  const { items: userRoles } = useFirestoreCollection('userRoles', {
    orderByField: 'roleName',
    orderDirection: 'asc',
    autoFetch: true
  });

  const { items: userPages, loading: pagesLoading } = useFirestoreCollection('userPages', {
    orderByField: 'pageName',
    orderDirection: 'asc',
    autoFetch: true
  });

  // Function to get all descendant role IDs (to prevent circular dependencies)
  const getDescendantRoleIds = useMemo(() => {
    return (roleId, roles) => {
      const descendants = new Set();
      const findDescendants = (currentRoleId) => {
        roles.forEach(role => {
          if (role.parentRoleId && role.parentRoleId === currentRoleId && !descendants.has(role.id)) {
            descendants.add(role.id);
            findDescendants(role.id);
          }
        });
      };
      findDescendants(roleId);
      return descendants;
    };
  }, []);

  // Filter available parent roles (exclude current role and its descendants)
  const availableParentRoles = useMemo(() => {
    if (!isEditMode || !id) {
      return userRoles;
    }
    const descendantIds = getDescendantRoleIds(id, userRoles);
    return userRoles.filter(role => role.id !== id && !descendantIds.has(role.id));
  }, [userRoles, id, isEditMode, getDescendantRoleIds]);

  // Filter available landing pages (only show pages that are granted access)
  const availableLandingPages = useMemo(() => {
    if (!formData.grantedPages || formData.grantedPages.length === 0) {
      return [];
    }
    return userPages.filter(page => formData.grantedPages.includes(page.id));
  }, [userPages, formData.grantedPages]);

  // Build hierarchical structure for pages
  const pageTree = useMemo(() => {
    if (!userPages || userPages.length === 0) return [];

    // Create a map of pages by ID
    const pageMap = new Map();
    userPages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    // Build tree structure
    const roots = [];
    userPages.forEach(page => {
      const pageNode = pageMap.get(page.id);
      if (page.parentId && pageMap.has(page.parentId)) {
        const parent = pageMap.get(page.parentId);
        parent.children.push(pageNode);
      } else {
        roots.push(pageNode);
      }
    });

    return roots;
  }, [userPages]);

  // Expand all pages by default - only initialize once when data first loads
  useEffect(() => {
    if (!pagesLoading && userPages && userPages.length > 0 && !initializedRef.current) {
      const allPageIds = new Set(userPages.map(page => page.id));
      setExpandedPages(allPageIds);
      initializedRef.current = true;
    } else if (!pagesLoading && (!userPages || userPages.length === 0)) {
      // Reset when data is cleared
      initializedRef.current = false;
      setExpandedPages(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagesLoading, userPages?.length]);

  useEffect(() => {
    if (isEditMode) {
      fetchUserRole();
    }
  }, [id, isEditMode]);

  const fetchUserRole = async () => {
    try {
      setFetching(true);
      setError('');
      const userRoleDocRef = doc(db, 'userRoles', id);
      const userRoleDoc = await getDoc(userRoleDocRef);
      
      if (userRoleDoc.exists()) {
        const userRoleData = userRoleDoc.data();
        setFormData({
          roleName: userRoleData.roleName || '',
          parentRoleId: userRoleData.parentRoleId || '',
          description: userRoleData.description || '',
          landingPage: userRoleData.landingPage || 'profile',
          grantedPages: userRoleData.grantedPages || [],
          userType: userRoleData.userType || 'inside'
        });
      } else {
        setError('User role not found');
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError('Failed to load user role data. Please try again.');
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

  const handlePageCheckboxChange = (pageId) => {
    setFormData(prev => {
      const currentPages = prev.grantedPages || [];
      const isChecked = currentPages.includes(pageId);
      const newGrantedPages = isChecked
        ? currentPages.filter(id => id !== pageId)
        : [...currentPages, pageId];
      
      // If the landing page is being unchecked, clear the landing page selection
      const uncheckedPage = userPages.find(p => p.id === pageId);
      const shouldClearLandingPage = isChecked && uncheckedPage && prev.landingPage === uncheckedPage.pageUrl;
      
      return {
        ...prev,
        grantedPages: newGrantedPages,
        landingPage: shouldClearLandingPage ? '' : prev.landingPage
      };
    });
  };

  const togglePageNode = (pageId) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  const renderPageCheckbox = (page, level = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedPages.has(page.id);
    const isChecked = formData.grantedPages?.includes(page.id) || false;
    const indent = level * 24;

    return (
      <div key={page.id} className="mb-1">
        <label
          className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors group relative"
          style={{ paddingLeft: `${indent + 8}px` }}
          title={page.description || `${page.pageName} - ${page.pageUrl}`}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              type="button"
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePageNode(page.id);
              }}
            >
              {isExpanded ? (
                <span className="material-symbols-outlined text-sm">expand_more</span>
              ) : (
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              )}
            </button>
          ) : (
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handlePageCheckboxChange(page.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
          />

          {/* Page Info */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900 block truncate">
              {page.pageName}
            </span>
            <span className="text-xs text-gray-500 block truncate">
              {page.pageUrl}
            </span>
          </div>

          {/* Description Tooltip */}
          {page.description && (
            <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
              {page.description}
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          )}
        </label>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div className="ml-6">
            {page.children.map(child => renderPageCheckbox(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.roleName.trim()) {
      setError('Role name is required');
      return;
    }

    // Check for circular dependency
    if (isEditMode && id && formData.parentRoleId && id === formData.parentRoleId) {
      setError('A role cannot be its own parent');
      return;
    }

    try {
      setLoading(true);
      
      const roleData = {
        roleName: formData.roleName.trim(),
        parentRoleId: formData.parentRoleId || null,
        description: formData.description.trim(),
        landingPage: formData.landingPage.trim(),
        grantedPages: formData.grantedPages || [],
        userType: formData.userType || 'inside',
        updatedAt: new Date()
      };
      
      if (isEditMode) {
        // Update existing user role - preserve createdAt
        const userRoleDocRef = doc(db, 'userRoles', id);
        const userRoleDoc = await getDoc(userRoleDocRef);
        const existingData = userRoleDoc.exists() ? userRoleDoc.data() : {};
        
        await setDoc(userRoleDocRef, {
          ...roleData,
          createdAt: existingData.createdAt || new Date()
        }, { merge: true });
      } else {
        // Create new user role
        await addDoc(collection(db, 'userRoles'), {
          ...roleData,
          createdAt: new Date()
        });
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/user-roles');
      }, 2000);
    } catch (err) {
      console.error('Error saving user role:', err);
      setError(`Failed to save user role: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/user-roles');
  };

  if (fetching) {
    return (
      <Layout title={isEditMode ? "Edit User Role" : "Add User Role"}>
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
      <Layout title={isEditMode ? "Edit User Role" : "Add User Role"}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined w-8 h-8 text-green-600 text-[32px]">check</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isEditMode ? 'User Role Updated!' : 'User Role Created!'}
              </h3>
              <p className="text-gray-600">
                {isEditMode 
                  ? 'User role information has been updated successfully.' 
                  : 'User role has been created successfully.'}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isEditMode ? "Edit User Role" : "Add User Role"}>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">admin_panel_settings</span>
                </div>
                <h2 className="text-2xl font-bold">{isEditMode ? 'Edit User Role' : 'Add User Role'}</h2>
              </div>
              <button
                onClick={() => navigate('/user-roles')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">arrow_back</span>
                Back to User Roles
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
              {/* Role Name Input */}
              <div className="md:col-span-2">
                <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="roleName"
                  name="roleName"
                  type="text"
                  value={formData.roleName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter role name"
                  required
                />
              </div>

              {/* Parent Role Dropdown */}
              <div className="md:col-span-2">
                <label htmlFor="parentRoleId" className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Role <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  name="parentRoleId"
                  value={formData.parentRoleId}
                  onChange={handleChange}
                  placeholder="None (Root Role)"
                  options={[
                    { value: '', label: 'None (Root Role)' },
                    ...availableParentRoles.map((role) => ({
                      value: role.id,
                      label: role.roleName
                    }))
                  ]}
                  showRoleChip={false}
                />
                {isEditMode && availableParentRoles.length === 0 && formData.parentRoleId && (
                  <p className="mt-2 text-sm text-gray-500">
                    No available parent roles (all roles are descendants of this role)
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Select a parent role to create a hierarchical structure. Leave as "None" for root roles.
                </p>
              </div>

              {/* User Type Radio Buttons */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  User Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value="inside"
                      checked={formData.userType === 'inside'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Inside Organization</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value="outside"
                      checked={formData.userType === 'outside'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Outside Organization</span>
                  </label>
                </div>
              </div>

              {/* Grant Access - Pages Checkboxes in Hierarchy */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Grant Access
                </label>
                <div className="border border-gray-300 rounded-xl p-4 bg-gray-50 max-h-[500px] overflow-y-auto">
                  {pagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner message="Loading pages..." />
                    </div>
                  ) : userPages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No user pages available. Please create pages first.
                    </p>
                  ) : pageTree.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No root pages found. All pages have parent pages.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {pageTree.map(rootPage => renderPageCheckbox(rootPage))}
                    </div>
                  )}
                </div>
                {formData.grantedPages && formData.grantedPages.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {formData.grantedPages.length} {formData.grantedPages.length === 1 ? 'page' : 'pages'} selected
                  </p>
                )}
              </div>

              {/* Landing Page Dropdown */}
              <div className="md:col-span-2">
                <label htmlFor="landingPage" className="block text-sm font-medium text-gray-700 mb-2">
                  Landing Page
                </label>
                <CustomSelect
                  name="landingPage"
                  value={formData.landingPage}
                  onChange={handleChange}
                  disabled={!formData.grantedPages || formData.grantedPages.length === 0}
                  placeholder={
                    formData.grantedPages && formData.grantedPages.length > 0
                      ? 'Select a landing page'
                      : 'Please grant access to pages first'
                  }
                  options={availableLandingPages.map((page) => ({
                    value: page.pageUrl,
                    label: `${page.pageName} (${page.pageUrl})`
                  }))}
                  showRoleChip={false}
                />
                {(!formData.grantedPages || formData.grantedPages.length === 0) && (
                  <p className="mt-2 text-sm text-gray-500">
                    Select pages in "Grant Access" above to enable landing page selection.
                  </p>
                )}
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
                  placeholder="Enter role description"
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
                  isEditMode ? 'Update User Role' : 'Create User Role'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default UserRoleForm;
