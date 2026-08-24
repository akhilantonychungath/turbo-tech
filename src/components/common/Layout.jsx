import React, { useMemo } from 'react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUserStatus } from '../../contexts/UserStatusContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = React.memo(({ children, title }) => {
  const { sidebarOpen } = useSidebar();
  const { isUserBlockedOrNotApproved } = useUserStatus();
  
  // Memoize sidebar visibility to prevent unnecessary recalculations
  const showSidebar = useMemo(() => !isUserBlockedOrNotApproved(), [isUserBlockedOrNotApproved]);
  
  // Memoize main content class to prevent unnecessary re-renders
  const mainContentClass = useMemo(() => 
    `flex-1 flex flex-col transition-all duration-300 ${
      showSidebar && sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
    }`,
    [showSidebar, sidebarOpen]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Sidebar - only show if user is not blocked and is approved */}
      {showSidebar && <Sidebar />}

      {/* Main Content Area */}
      <div className={`${mainContentClass} h-screen overflow-hidden relative`}>
        {/* Top Bar - Fixed at top */}
        <TopBar />

        {/* Main Content - Scrollable area starting from TopBar level */}
        <div 
          className="overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent absolute inset-0 top-[72px]" 
          style={{ backgroundColor: '#E5F0FF' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;

