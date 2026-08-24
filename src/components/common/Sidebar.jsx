import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUserStatus } from '../../contexts/UserStatusContext';
import { menuItems, registrationItems, administrationItems, settingsItems } from '../../constants/menuItems';

// Constants
const DESKTOP_BREAKPOINT = 1024;
const HEADER_HEIGHT = 'min-h-[72px]';
const LOGO_SIZE = 'h-10 w-10';
const ICON_SIZE = 'w-5 h-5';

// Menu Item Component
const MenuItem = ({ item, isActive, onClick }) => (
  <button
    onClick={() => onClick(item.path)}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    {item.icon}
    <span className="font-medium text-sm">{item.title}</span>
  </button>
);

// Collapsible Section Component
const CollapsibleSection = ({ title, items, isActive, onNavigate, isExpanded, onToggle }) => {
  return (
    <div className="px-3 mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 mb-2 rounded-lg hover:bg-gray-800 transition-colors group"
        aria-expanded={isExpanded}
      >
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-300">
          {title}
        </h2>
        <span className={`material-symbols-outlined text-gray-400 text-lg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {items.map((item) => (
          <MenuItem
            key={item.path}
            item={item}
            isActive={isActive(item.path)}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, closeSidebar, openSidebar } = useSidebar();
  const { isUserBlockedOrNotApproved } = useUserStatus();
  
  // State for collapsed sections
  const [expandedSections, setExpandedSections] = useState({
    registration: true,
    administration: false,
    settings: false
  });

  // Ensure sidebar is closed for blocked/unapproved users
  useEffect(() => {
    if (isUserBlockedOrNotApproved() && sidebarOpen) {
      closeSidebar();
    }
  }, [isUserBlockedOrNotApproved, sidebarOpen, closeSidebar]);

  // Ensure sidebar is visible by default on desktop screens (only on initial mount)
  // But only if user is not blocked/not approved
  useEffect(() => {
    // Only auto-open on initial mount if on desktop and user is approved
    if (!isUserBlockedOrNotApproved() && window.innerWidth >= DESKTOP_BREAKPOINT && !sidebarOpen) {
      openSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  const handleNavigation = useCallback((path) => {
    navigate(path);
    // Close sidebar on mobile/tablet after navigation for better UX
    if (window.innerWidth < DESKTOP_BREAKPOINT) {
      closeSidebar();
    }
  }, [navigate, closeSidebar]);

  const isActive = useCallback((path) => {
    const currentPath = location.pathname;
    
    // Special handling for Company menu item
    if (path === '/companies') {
      return currentPath === '/companies' || 
             currentPath === '/company-registration' || 
             currentPath.startsWith('/companies/edit/');
    }
    
    // Special handling for Dealer menu item
    if (path === '/dealers') {
      return currentPath === '/dealers' || 
             currentPath === '/dealers/add' ||
             currentPath.startsWith('/dealers/edit/');
    }
    
    // Special handling for Users menu item
    if (path === '/users') {
      return currentPath === '/users' || 
             currentPath.startsWith('/users/edit/');
    }
    
    // Special handling for User Role menu item
    if (path === '/user-roles') {
      return currentPath === '/user-roles' || 
             currentPath === '/user-roles/add' ||
             currentPath.startsWith('/user-roles/edit/');
    }
    
    // Special handling for User Pages menu item
    if (path === '/user-pages') {
      return currentPath === '/user-pages' || 
             currentPath === '/user-pages/add' ||
             currentPath.startsWith('/user-pages/edit/');
    }
    
    // Special handling for Services menu item
    if (path === '/services') {
      return currentPath === '/services' || 
             currentPath === '/services/add' ||
             currentPath.startsWith('/services/edit/');
    }
    
    // Special handling for Brands menu item
    if (path === '/brands') {
      return currentPath === '/brands' || 
             currentPath === '/brands/add' ||
             currentPath.startsWith('/brands/edit/');
    }
    
    // Special handling for Role Hierarchy menu item
    if (path === '/role-hierarchy') {
      return currentPath === '/role-hierarchy';
    }
    
    return currentPath === path;
  }, [location.pathname]);

  // Check if any item in a section is active and auto-expand that section
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Check Registration section
    const registrationActive = registrationItems.some(item => {
      if (item.path === '/companies') {
        return currentPath === '/companies' || 
               currentPath === '/company-registration' || 
               currentPath.startsWith('/companies/edit/');
      }
      if (item.path === '/dealers') {
        return currentPath === '/dealers' || 
               currentPath === '/dealers/add' ||
               currentPath.startsWith('/dealers/edit/');
      }
      if (item.path === '/agent-registration') {
        return currentPath === '/agent-registration';
      }
      return currentPath === item.path || currentPath.startsWith(item.path);
    });
    
    // Check Administration section
    const administrationActive = administrationItems.some(item => {
      if (item.path === '/users') {
        return currentPath === '/users' || currentPath.startsWith('/users/edit/');
      }
      if (item.path === '/user-roles') {
        return currentPath === '/user-roles' || 
               currentPath === '/user-roles/add' ||
               currentPath.startsWith('/user-roles/edit/');
      }
      if (item.path === '/role-hierarchy') {
        return currentPath === '/role-hierarchy';
      }
      return currentPath === item.path || currentPath.startsWith(item.path);
    });
    
    // Check Settings section
    const settingsActive = settingsItems.some(item => {
      if (item.path === '/user-pages') {
        return currentPath === '/user-pages' || 
               currentPath === '/user-pages/add' ||
               currentPath.startsWith('/user-pages/edit/');
      }
      if (item.path === '/services') {
        return currentPath === '/services' || 
               currentPath === '/services/add' ||
               currentPath.startsWith('/services/edit/');
      }
      if (item.path === '/brands') {
        return currentPath === '/brands' || 
               currentPath === '/brands/add' ||
               currentPath.startsWith('/brands/edit/');
      }
      return currentPath === item.path || currentPath.startsWith(item.path);
    });
    
    // Auto-expand sections that contain active items
    setExpandedSections(prev => ({
      registration: registrationActive ? true : prev.registration,
      administration: administrationActive ? true : prev.administration,
      settings: settingsActive ? true : prev.settings
    }));
  }, [location.pathname]);

  // Toggle section expansion
  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  return (
    <>
      {/* Overlay - shows when sidebar is open on mobile/tablet only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-[#000E24] text-white z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 shadow-xl`}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-screen">
          {/* Sidebar Header with Logo and App Name */}
          <header className={`px-4 h-[72px] border-b border-gray-700 flex items-center`}>
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Turbo ERP Logo"
                className={`${LOGO_SIZE} object-contain brightness-0 invert`}
              />
              <h1 className="text-xl font-bold text-white">Turbo ERP</h1>
            </div>
          </header>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent" aria-label="Navigation menu">
            {/* Main Menu */}
            <div className="px-3 mb-4">
              {menuItems.map((item) => (
                <MenuItem
                  key={item.path}
                  item={item}
                  isActive={isActive(item.path)}
                  onClick={handleNavigation}
                />
              ))}
            </div>

            {/* Registration Section */}
            <CollapsibleSection
              title="Registration"
              items={registrationItems}
              isActive={isActive}
              onNavigate={handleNavigation}
              isExpanded={expandedSections.registration}
              onToggle={() => toggleSection('registration')}
            />

            {/* Administration Section */}
            <CollapsibleSection
              title="Administration"
              items={administrationItems}
              isActive={isActive}
              onNavigate={handleNavigation}
              isExpanded={expandedSections.administration}
              onToggle={() => toggleSection('administration')}
            />

            {/* Settings Section */}
            <CollapsibleSection
              title="Settings"
              items={settingsItems}
              isActive={isActive}
              onNavigate={handleNavigation}
              isExpanded={expandedSections.settings}
              onToggle={() => toggleSection('settings')}
            />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

