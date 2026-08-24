import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const CheckingAccessPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Function to check user status and redirect accordingly
  const checkUserStatusAndRedirect = useCallback(async () => {
    // If no user or email not verified, redirect to login
    if (!currentUser || !currentUser.emailVerified) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // User document doesn't exist, redirect to profile page
        navigate('/profile', { replace: true });
        return;
      }

      const { status, isBlocked, userRoleId } = userDoc.data();
      
      // Check if user is approved AND not blocked
      const isApproved = status === 'approved';
      const isNotBlocked = !isBlocked;
      
      if (isApproved && isNotBlocked) {
        // User is approved and not blocked - check for role-based landing page
        if (userRoleId) {
          try {
            const userRoleDocRef = doc(db, 'userRoles', userRoleId);
            const userRoleDoc = await getDoc(userRoleDocRef);
            
            if (userRoleDoc.exists()) {
              const { landingPage } = userRoleDoc.data();
              // Navigate to landing page if configured
              if (landingPage && landingPage.trim()) {
                // Ensure the path starts with '/' to make it an absolute path
                const normalizedPath = landingPage.trim().startsWith('/') 
                  ? landingPage.trim() 
                  : `/${landingPage.trim()}`;
                navigate(normalizedPath, { replace: true });
                return;
              }
            }
          } catch (roleError) {
            console.error('Error fetching user role:', roleError);
            // Fall through to profile page if role fetch fails
          }
        }
        // Landing page not configured - redirect to profile page
        navigate('/profile', { replace: true });
      } else {
        // User is not approved OR user is blocked - redirect to profile page without side menu
        // The Layout component will automatically hide the side menu for blocked/unapproved users
        navigate('/profile', { replace: true });
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // On error, redirect to profile page
      navigate('/profile', { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    checkUserStatusAndRedirect();
  }, [checkUserStatusAndRedirect]);

  // Show checking access screen
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#E5F0FF' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">Checking access...</p>
      </div>
    </div>
  );
};

export default CheckingAccessPage;

