import React, { Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserStatus } from '../../contexts/UserStatusContext';

/**
 * Secure Lazy Component Wrapper
 * 
 * This component wraps lazy-loaded components with security checks
 * to prevent unauthorized module loads and provides error handling.
 */
const SecureLazyComponent = ({ 
  component: LazyComponent, 
  requireAuth = false,
  requireEmailVerified = false,
  requireProfile = false,
  fallback = null,
  onUnauthorized = null
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isUserBlockedOrNotApproved } = useUserStatus();
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Security check: Verify authentication
    if (requireAuth && !currentUser) {
      const authError = new Error('Unauthorized: Authentication required');
      authError.code = 'UNAUTHORIZED_AUTH';
      setError(authError);
      setIsAuthorized(false);
      
      if (onUnauthorized) {
        onUnauthorized('authentication', authError);
      }
      
      // Log security violation
      console.warn('[Security] Unauthorized module load attempt - Authentication required', {
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
      });
      
      navigate('/login', { replace: true });
      return;
    }

    // Security check: Verify email verification
    if (requireEmailVerified && currentUser && !currentUser.emailVerified) {
      const emailError = new Error('Unauthorized: Email verification required');
      emailError.code = 'UNAUTHORIZED_EMAIL';
      setError(emailError);
      setIsAuthorized(false);
      
      if (onUnauthorized) {
        onUnauthorized('email_verification', emailError);
      }
      
      navigate('/verify-email', { replace: true });
      return;
    }

    // Security check: Verify user status
    if (requireAuth && currentUser && isUserBlockedOrNotApproved && isUserBlockedOrNotApproved()) {
      const statusError = new Error('Unauthorized: User account is blocked or not approved');
      statusError.code = 'UNAUTHORIZED_STATUS';
      setError(statusError);
      setIsAuthorized(false);
      
      if (onUnauthorized) {
        onUnauthorized('user_status', statusError);
      }
      
      navigate('/profile', { replace: true });
      return;
    }

    // All checks passed
    setIsAuthorized(true);
    setError(null);
  }, [currentUser, requireAuth, requireEmailVerified, requireProfile, isUserBlockedOrNotApproved, navigate, onUnauthorized]);

  // Show loading while checking authorization
  if (isAuthorized === null) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show error if unauthorized
  if (!isAuthorized || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            {error?.code === 'UNAUTHORIZED_AUTH' && 'You must be logged in to access this page.'}
            {error?.code === 'UNAUTHORIZED_EMAIL' && 'Please verify your email address to continue.'}
            {error?.code === 'UNAUTHORIZED_STATUS' && 'Your account is blocked or pending approval.'}
            {!error && 'You do not have permission to access this page.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Render the lazy component with Suspense
  return (
    <Suspense fallback={fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading module...</p>
        </div>
      </div>
    )}>
      <LazyComponent />
    </Suspense>
  );
};

export default SecureLazyComponent;

