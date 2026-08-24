import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { reload } from 'firebase/auth';
import { auth } from '../../firebase';

const EmailVerificationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, sendVerificationEmail, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [checking, setChecking] = useState(false);
  
  // Get email from location state or currentUser
  const userEmail = location.state?.email || currentUser?.email || '';

  useEffect(() => {
    // If no user is logged in, redirect to login
    if (!currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleResendVerification = async () => {
    try {
      setResending(true);
      setError('');
      await sendVerificationEmail();
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send verification email');
      console.error('Resend verification error:', err);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setChecking(true);
      setError('');
      
      // Reload user to get latest email verification status
      if (auth.currentUser) {
        await reload(auth.currentUser);
        
        // Check if email is now verified
        if (auth.currentUser.emailVerified) {
          setSuccess('Email verified successfully! Redirecting to profile setup...');
          setTimeout(() => {
            navigate('/profile', { replace: true });
          }, 2000);
        } else {
          setError('Email is not yet verified. Please check your inbox and click the verification link.');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to check verification status');
      console.error('Check verification error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
          {/* Logo/Title Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Turbo ERP Logo" 
                className="h-16 w-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
            <p className="text-gray-600">We've sent a verification link to your email</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-full p-6">
              <span className="material-symbols-outlined w-16 h-16 text-blue-600 text-[64px]">mail</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6 text-center">
            <p className="text-gray-700 mb-2">
              A verification email has been sent to:
            </p>
            <p className="text-lg font-semibold text-blue-600 mb-4 break-all">
              {userEmail}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Please follow these steps:</strong>
              </p>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Check your inbox (and spam folder) for the verification email</li>
                <li>Click on the verification link in the email</li>
                <li>Return here and click "I've Verified My Email"</li>
              </ol>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </span>
              ) : (
                "I've Verified My Email"
              )}
            </button>

            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Resend Verification Email'
              )}
            </button>

            <button
              onClick={handleBackToLogin}
              className="w-full py-3 px-6 text-gray-600 font-medium rounded-xl hover:text-gray-800 focus:outline-none transition-all duration-200"
            >
              Back to Login
            </button>
          </div>

          {/* Info Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              You must verify your email before you can access the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;

