import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useUserStatus } from '../../contexts/UserStatusContext';
import useClickOutside from '../../hooks/useClickOutside';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// Constants
const HEADER_HEIGHT = 'min-h-[72px]';
const ICON_SIZE = 'w-5 h-5';
const LOGO_SIZE = 'h-10 w-10';
const PROFILE_SIZE = 'w-10 h-10';

// Icon Components
const CloseIcon = () => (
  <span className={`material-symbols-outlined ${ICON_SIZE}`}>close</span>
);

const MenuIcon = () => (
  <span className={`material-symbols-outlined ${ICON_SIZE}`}>menu</span>
);

const ChevronDownIcon = ({ isOpen }) => (
  <span className={`material-symbols-outlined ${ICON_SIZE} text-white transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
    keyboard_arrow_down
  </span>
);

const TopBar = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { isUserBlockedOrNotApproved } = useUserStatus();
  const [showMenu, setShowMenu] = useState(false);
  const [userName, setUserName] = useState('');
  const menuRef = useClickOutside(() => setShowMenu(false));
  
  // Hide hamburger menu for blocked/unapproved users
  const showHamburgerMenu = !isUserBlockedOrNotApproved();

  // Fetch user name from Firestore
  useEffect(() => {
    if (!currentUser) {
      setUserName('');
      return;
    }

    let isMounted = true;

    const fetchUserName = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        const name = userDoc.exists() 
          ? userDoc.data().name || currentUser.displayName || ''
          : currentUser.displayName || '';
        
        if (isMounted) {
          setUserName(name);
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        if (isMounted) {
          setUserName(currentUser.displayName || '');
        }
      }
    };

    fetchUserName();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [logout]);

  const handleProfileClick = useCallback(() => {
    setShowMenu(false);
    navigate('/profile');
  }, [navigate]);

  // Ensure displayName is always a clean string without unexpected concatenation
  const displayName = React.useMemo(() => {
    const name = userName || currentUser?.displayName || 'User';
    // Return the name as-is, ensuring it's a string
    return String(name).trim();
  }, [userName, currentUser?.displayName]);

  return (
    <header 
      className={`bg-[#000E24] shadow-md fixed top-0 left-0 right-0 z-[60] transition-all duration-300 h-[72px] ${
      sidebarOpen && showHamburgerMenu ? 'lg:left-64' : ''
      }`}
    >
      <div className={`px-3 sm:px-4 h-full flex items-center`}>
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Left Side: Hamburger Menu + Logo + App Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {showHamburgerMenu && (
            <button
              onClick={toggleSidebar}
              className="text-white hover:bg-gray-800 p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle sidebar"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            )}
            <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${sidebarOpen && showHamburgerMenu ? 'lg:hidden' : ''}`}>
                <img
                  src="/logo.png"
                  alt="Turbo ERP Logo"
                className={`${LOGO_SIZE} object-contain flex-shrink-0 brightness-0 invert`}
                />
              <h1 className="text-xl font-bold text-white truncate">Turbo ERP</h1>
              </div>
          </div>

          {/* Profile Info with Dropdown Menu */}
          {currentUser && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                type="button"
                className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowMenu(!showMenu)}
                aria-label="User menu"
                aria-expanded={showMenu}
              >
                {/* User Name and Email - Visible on large screens only */}
                <div className="hidden lg:flex flex-col items-start mr-2">
                  <span className="text-sm font-medium text-white leading-tight">
                    {displayName}
                  </span>
                  <span className="text-xs text-gray-300 leading-tight truncate max-w-[200px]">
                    {currentUser.email}
                  </span>
                </div>
                
                {/* Profile Picture */}
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={`${displayName}'s profile`}
                    className={`${PROFILE_SIZE} rounded-full border-2 border-white/30 flex-shrink-0`}
                  />
                ) : (
                  <div className={`${PROFILE_SIZE} rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <ChevronDownIcon isOpen={showMenu} />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-max"
                  role="menu"
                >
                  <button
                    onClick={handleProfileClick}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                    role="menuitem"
                  >
                    <span className="material-symbols-outlined w-4 h-4">person</span>
                    View Profile
                  </button>
                  <div className="border-t border-gray-200 my-1" role="separator" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    role="menuitem"
                  >
                    <span className="material-symbols-outlined w-4 h-4">logout</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;

