import { lazy } from 'react';

/**
 * Secure Lazy Loader Utility
 * 
 * This utility provides secure lazy loading of modules with authorization checks
 * to prevent unauthorized module loads.
 */

/**
 * Creates a secure lazy-loaded component with authorization checks
 * @param {Function} importFn - Function that returns a dynamic import promise
 * @param {Object} options - Configuration options
 * @param {Function} options.authCheck - Function to check if user is authenticated
 * @param {Function} options.authorizationCheck - Optional function to check specific permissions
 * @param {Function} options.onUnauthorized - Optional callback when unauthorized access is attempted
 * @returns {React.LazyExoticComponent} Lazy-loaded component with security wrapper
 */
export const createSecureLazy = (importFn, options = {}) => {
  const {
    authCheck = null,
    authorizationCheck = null,
    onUnauthorized = null,
  } = options;

  // Track loaded modules for security audit
  const loadedModules = new Set();
  
  // Create the lazy component
  const LazyComponent = lazy(async () => {
    try {
      // Security check: Verify authentication before loading
      if (authCheck && !authCheck()) {
        const error = new Error('Unauthorized: Authentication required');
        error.code = 'UNAUTHORIZED_AUTH';
        if (onUnauthorized) {
          onUnauthorized('authentication', error);
        }
        throw error;
      }

      // Security check: Verify authorization/permissions
      if (authorizationCheck && !authorizationCheck()) {
        const error = new Error('Unauthorized: Insufficient permissions');
        error.code = 'UNAUTHORIZED_PERMISSION';
        if (onUnauthorized) {
          onUnauthorized('authorization', error);
        }
        throw error;
      }

      // Load the module
      const module = await importFn();
      
      // Track successfully loaded modules (for security audit)
      const moduleName = importFn.toString().match(/['"](.*?)['"]/)?.[1] || 'unknown';
      loadedModules.add(moduleName);
      
      return module;
    } catch (error) {
      // Log security violations
      if (error.code === 'UNAUTHORIZED_AUTH' || error.code === 'UNAUTHORIZED_PERMISSION') {
        console.warn('[Security] Unauthorized module load attempt:', {
          module: importFn.toString(),
          reason: error.code,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  });

  // Add metadata for security tracking
  LazyComponent._secureLazy = true;
  LazyComponent._loadedModules = loadedModules;

  return LazyComponent;
};

/**
 * Module access control registry
 * Maps routes to required permissions/roles
 */
export const moduleAccessControl = {
  '/dashboard': { requireAuth: true, requireProfile: true },
  '/companies': { requireAuth: true, requireProfile: true },
  '/company-registration': { requireAuth: true, requireProfile: true },
  '/companies/edit/:id': { requireAuth: true, requireProfile: true },
  '/agent-registration': { requireAuth: true, requireProfile: true },
  '/dealers/add': { requireAuth: true, requireProfile: true },
  '/users': { requireAuth: true, requireProfile: true },
  '/users/add': { requireAuth: true, requireProfile: true },
  '/users/edit/:id': { requireAuth: true, requireProfile: true },
  '/user-types': { requireAuth: true, requireProfile: true },
  '/user-types/add': { requireAuth: true, requireProfile: true },
  '/user-types/edit/:id': { requireAuth: true, requireProfile: true },
  '/user-roles': { requireAuth: true, requireProfile: true },
  '/user-roles/add': { requireAuth: true, requireProfile: true },
  '/user-roles/edit/:id': { requireAuth: true, requireProfile: true },
  '/profile': { requireAuth: true, requireEmailVerified: true },
  '/verify-email': { requireAuth: true },
  '/login': { public: true },
};

/**
 * Creates authorization check function based on route requirements
 */
export const createAuthCheck = (currentUser, profileComplete, isUserBlockedOrNotApproved) => {
  return (requireAuth = true, requireProfile = false, requireEmailVerified = false) => {
    if (!requireAuth) return true;
    
    if (!currentUser) return false;
    if (requireEmailVerified && !currentUser.emailVerified) return false;
    if (isUserBlockedOrNotApproved && isUserBlockedOrNotApproved()) return false;
    if (requireProfile && profileComplete === false) return false;
    
    return true;
  };
};

// Note: React import will be handled by the component using this utility
// This is a utility file, so we'll import React where needed

