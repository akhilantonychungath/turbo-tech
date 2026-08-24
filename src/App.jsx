import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { UserStatusProvider, useUserStatus } from './contexts/UserStatusContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import ModuleErrorBoundary from './components/common/ModuleErrorBoundary';
import './App.css';

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load all components - only load when route is accessed
// Public routes (can be loaded without authentication)
const LoginPage = lazy(() => import('./components/common/LoginPage'));

// Protected routes (require authentication)
const EmailVerificationPage = lazy(() => import('./components/common/EmailVerificationPage'));
const CheckingAccessPage = lazy(() => import('./components/common/CheckingAccessPage'));
const Dashboard = lazy(() => import('./components/common/Dashboard'));
const ProfilePage = lazy(() => import('./components/common/ProfilePage'));
const CallDashboard = lazy(() => import('./components/common/CallDashboard'));

// Company routes
const CompanyList = lazy(() => import('./components/company/CompanyList'));
const CompanyRegistrationForm = lazy(() => import('./components/company/CompanyRegistrationForm'));
const CompanyEditForm = lazy(() => import('./components/company/CompanyEditForm'));

// Agent routes
const AgentRegistrationForm = lazy(() => import('./components/agent/AgentRegistrationForm'));

// Dealer routes
const DealersList = lazy(() => import('./components/dealer/DealersList'));
const DealerRegistrationForm = lazy(() => import('./components/dealer/DealerRegistrationForm'));
const DealerEditForm = lazy(() => import('./components/dealer/DealerEditForm'));

// User management routes
const UserList = lazy(() => import('./components/user/UserList'));
const UserRegistrationForm = lazy(() => import('./components/user/UserRegistrationForm'));
const UserEditForm = lazy(() => import('./components/user/UserEditForm'));
const UserRoleList = lazy(() => import('./components/user/UserRoleList'));
const UserRoleForm = lazy(() => import('./components/user/UserRoleForm'));
const RoleHierarchy = lazy(() => import('./components/user/RoleHierarchy'));

// Settings routes
const UserPageList = lazy(() => import('./components/settings/UserPageList'));
const UserPageForm = lazy(() => import('./components/settings/UserPageForm'));
const ServiceList = lazy(() => import('./components/settings/ServiceList'));
const ServiceForm = lazy(() => import('./components/settings/ServiceForm'));
const BrandList = lazy(() => import('./components/settings/BrandList'));
const BrandForm = lazy(() => import('./components/settings/BrandForm'));

function AppContent() {
  const { currentUser } = useAuth();
  const { isUserBlockedOrNotApproved } = useUserStatus();
  const [profileComplete, setProfileComplete] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileCheckKey, setProfileCheckKey] = useState(0);

  // Check profile completion
  useEffect(() => {
    const checkProfile = async () => {
      if (!currentUser || !currentUser.emailVerified) {
        setProfileComplete(null);
        setCheckingProfile(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileComplete(!!userData.name);
        } else {
          setProfileComplete(false);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setProfileComplete(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [currentUser, profileCheckKey]);

  // Expose refresh function via window for ProfilePage to call
  useEffect(() => {
    window.refreshProfileCheck = () => {
      setProfileCheckKey(prev => prev + 1);
    };
    return () => {
      delete window.refreshProfileCheck;
    };
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children, requireProfile = false }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    if (!currentUser.emailVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    // Redirect blocked or unapproved users to profile
    if (isUserBlockedOrNotApproved()) {
      return <Navigate to="/profile" replace />;
    }
    if (requireProfile && profileComplete === false) {
      return <Navigate to="/profile" replace />;
    }
    return children;
  };

  // Profile route - accessible if verified but doesn't require profile completion
  const ProfileRoute = ({ children }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    if (!currentUser.emailVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    return children;
  };

  // Show loading while checking profile
  if (checkingProfile && currentUser && currentUser.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ModuleErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route 
        path="/login" 
        element={
          currentUser && !currentUser.emailVerified
            ? <Navigate to="/verify-email" replace />
            : <LoginPage />
        } 
      />
      <Route 
        path="/verify-email" 
        element={
          currentUser 
            ? <EmailVerificationPage /> 
            : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/checking-access" 
        element={
          currentUser && currentUser.emailVerified
            ? <CheckingAccessPage /> 
            : <Navigate to="/login" replace />
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProfileRoute>
            <ProfilePage />
          </ProfileRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requireProfile={true}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/call-dashboard" 
        element={
          <ProtectedRoute requireProfile={true}>
            <CallDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/companies" 
        element={
          <ProtectedRoute requireProfile={true}>
            <CompanyList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/company-registration" 
        element={
          <ProtectedRoute requireProfile={true}>
            <CompanyRegistrationForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/companies/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <CompanyEditForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/agent-registration" 
        element={
          <ProtectedRoute requireProfile={true}>
            <AgentRegistrationForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dealers" 
        element={
          <ProtectedRoute requireProfile={true}>
            <DealersList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dealers/add" 
        element={
          <ProtectedRoute requireProfile={true}>
            <DealerRegistrationForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dealers/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <DealerEditForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users/add" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserRegistrationForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/users/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserEditForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-roles" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserRoleList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-roles/add" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserRoleForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-roles/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserRoleForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/role-hierarchy" 
        element={
          <ProtectedRoute requireProfile={true}>
            <RoleHierarchy />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-pages" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserPageList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-pages/add" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserPageForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/user-pages/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <UserPageForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services" 
        element={
          <ProtectedRoute requireProfile={true}>
            <ServiceList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/add" 
        element={
          <ProtectedRoute requireProfile={true}>
            <ServiceForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <ServiceForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/brands" 
        element={
          <ProtectedRoute requireProfile={true}>
            <BrandList />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/brands/add" 
        element={
          <ProtectedRoute requireProfile={true}>
            <BrandForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/brands/edit/:id" 
        element={
          <ProtectedRoute requireProfile={true}>
            <BrandForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          currentUser && currentUser.emailVerified
            ? (isUserBlockedOrNotApproved() || profileComplete === false
                ? <Navigate to="/profile" replace />
                : <Navigate to="/dashboard" replace />)
            : currentUser && !currentUser.emailVerified
            ? <Navigate to="/verify-email" replace />
            : <Navigate to="/login" replace />
        } 
      />
    </Routes>
      </Suspense>
    </ModuleErrorBoundary>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <UserStatusProvider>
        <SidebarProvider>
          <AppContent />
        </SidebarProvider>
        </UserStatusProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
