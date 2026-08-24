import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserStatus } from './UserStatusContext';

const SidebarContext = createContext({});

export const useSidebar = () => {
  return useContext(SidebarContext);
};

const SidebarProviderContent = ({ children }) => {
  const { isUserBlockedOrNotApproved, userStatus } = useUserStatus();
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open

  // Keep sidebar closed for blocked/unapproved users
  useEffect(() => {
    if (isUserBlockedOrNotApproved()) {
      setSidebarOpen(false);
    }
  }, [isUserBlockedOrNotApproved, userStatus]);

  const toggleSidebar = () => {
    // Prevent toggling if user is blocked/not approved
    if (isUserBlockedOrNotApproved()) {
      return;
    }
    setSidebarOpen(prev => !prev);
  };

  const openSidebar = () => {
    // Prevent opening if user is blocked/not approved
    if (isUserBlockedOrNotApproved()) {
      return;
    }
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const value = {
    sidebarOpen: isUserBlockedOrNotApproved() ? false : sidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setSidebarOpen
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const SidebarProvider = ({ children }) => {
  return <SidebarProviderContent>{children}</SidebarProviderContent>;
};

