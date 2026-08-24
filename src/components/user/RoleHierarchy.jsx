import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../common/Layout';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';

const RoleHierarchy = () => {
  const navigate = useNavigate();
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const { items: userRoles, loading, error } = useFirestoreCollection('userRoles', {
    orderByField: 'roleName',
    orderDirection: 'asc'
  });

  // Expand all nodes by default
  useEffect(() => {
    if (userRoles && userRoles.length > 0) {
      const allRoleIds = new Set(userRoles.map(role => role.id));
      setExpandedNodes(allRoleIds);
    }
  }, [userRoles]);

  // Build hierarchical structure
  const roleTree = useMemo(() => {
    if (!userRoles || userRoles.length === 0) return [];

    // Create a map of roles by ID
    const roleMap = new Map();
    userRoles.forEach(role => {
      roleMap.set(role.id, { ...role, children: [] });
    });

    // Build tree structure
    const roots = [];
    userRoles.forEach(role => {
      const roleNode = roleMap.get(role.id);
      if (role.parentRoleId && roleMap.has(role.parentRoleId)) {
        const parent = roleMap.get(role.parentRoleId);
        parent.children.push(roleNode);
      } else {
        roots.push(roleNode);
      }
    });

    return roots;
  }, [userRoles]);

  const toggleNode = (roleId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const renderRoleNode = (role, level = 0) => {
    const hasChildren = role.children && role.children.length > 0;
    const isExpanded = expandedNodes.has(role.id);
    const indent = level * 24;

    return (
      <div key={role.id} className="mb-1">
        <div
          className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => hasChildren && toggleNode(role.id)}
        >
          {hasChildren ? (
            <button
              className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(role.id);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900">{role.roleName}</h3>
              {role.description && (
                <p className="text-sm text-gray-600 mt-1 truncate">{role.description}</p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user-roles/edit/${role.id}`);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm leading-none inline-flex items-center">edit</span>
              <span>Edit</span>
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-6">
            {role.children.map(child => renderRoleNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="Role Hierarchy">
      <div className="container mx-auto px-4 py-8 flex flex-col">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <span className="material-symbols-outlined w-6 h-6">account_tree</span>
                </div>
                <h2 className="text-2xl font-bold">Role Hierarchy</h2>
              </div>

              <button
                onClick={() => navigate('/user-roles')}
                className="bg-[#000E24] text-white hover:bg-[#001a3d] rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold whitespace-nowrap"
              >
                <span className="material-symbols-outlined w-5 h-5">admin_panel_settings</span>
                Manage Roles
              </button>
            </div>
          </div>
        </div>

        {/* Hierarchy Tree */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-1 min-h-[calc(100vh-300px)]">
          {loading ? (
            <LoadingSpinner message="Loading role hierarchy..." />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : userRoles.length === 0 ? (
            <EmptyState
              icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              title="No Roles Found"
              message="No user roles have been created yet."
              actionLabel="Create First Role"
              onAction={() => navigate('/user-roles/add')}
            />
          ) : roleTree.length === 0 ? (
            <EmptyState
              icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              title="No Root Roles Found"
              message="All roles have parent roles. The hierarchy structure may be incomplete."
            />
          ) : (
            <div className="space-y-2">
              {roleTree.map(rootRole => renderRoleNode(rootRole))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RoleHierarchy;

