import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const UserStatusContext = createContext({});

export const useUserStatus = () => {
  return useContext(UserStatusContext);
};

export const UserStatusProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userStatus, setUserStatus] = useState({ isBlocked: false, status: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!currentUser || !currentUser.emailVerified) {
        setUserStatus({ isBlocked: false, status: null });
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserStatus({
            isBlocked: userData.isBlocked === true,
            status: userData.status || null
          });
        } else {
          setUserStatus({ isBlocked: false, status: null });
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setUserStatus({ isBlocked: false, status: null });
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [currentUser]);

  // Expose refresh function
  const refreshUserStatus = async () => {
    if (!currentUser || !currentUser.emailVerified) return;
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserStatus({
          isBlocked: userData.isBlocked === true,
          status: userData.status || null
        });
      }
    } catch (error) {
      console.error('Error refreshing user status:', error);
    }
  };

  const isUserBlockedOrNotApproved = () => {
    return userStatus.isBlocked === true || userStatus.status !== 'approved';
  };

  const value = {
    userStatus,
    isUserBlockedOrNotApproved,
    refreshUserStatus,
    loading
  };

  return (
    <UserStatusContext.Provider value={value}>
      {children}
    </UserStatusContext.Provider>
  );
};

