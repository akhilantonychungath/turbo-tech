import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { reload } from 'firebase/auth';
import { auth } from '../../firebase';

// Error message mappings
const AUTH_ERROR_MESSAGES = {
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/invalid-email': 'Invalid email address',
  'auth/user-disabled': 'This account has been disabled',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password is too weak',
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const { 
    signInWithGoogle, 
    signInWithEmailPassword, 
    registerWithEmailPassword,
    sendVerificationEmail,
    resetPassword,
    currentUser 
  } = useAuth();

  useEffect(() => {
    // Check if user is logged in but email is not verified
    if (currentUser && !currentUser.emailVerified && mode === 'login') {
      setShowVerificationMessage(true);
    } else if (currentUser && currentUser.emailVerified) {
      setShowVerificationMessage(false);
    }
  }, [currentUser, mode]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      const user = await signInWithGoogle();
      
      if (!user?.emailVerified) {
        await auth.signOut();
        navigate('/verify-email', { 
          state: { email: user?.email },
          replace: true 
        });
        return;
      }
      
      // Redirect to checking access page
      navigate('/checking-access', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate, signInWithGoogle]);

  const handleEmailPasswordLogin = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const user = await signInWithEmailPassword(email, password);
      
      // Reload user to get latest email verification status
      await reload(user);
      
      if (!user.emailVerified) {
        await auth.signOut();
        navigate('/verify-email', { 
          state: { email: user.email },
          replace: true 
        });
        return;
      }
      
      // Redirect to checking access page
      navigate('/checking-access', { replace: true });
    } catch (err) {
      const errorMessage = AUTH_ERROR_MESSAGES[err.code] || err.message || 'Failed to sign in';
      setError(errorMessage);
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  }, [email, password, navigate, signInWithEmailPassword]);

  const handleEmailPasswordRegister = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const user = await registerWithEmailPassword(email, password);
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Redirect to verification page
      navigate('/verify-email', { 
        state: { email: user.email },
        replace: true 
      });
    } catch (err) {
      const errorMessage = AUTH_ERROR_MESSAGES[err.code] || err.message || 'Failed to register';
      setError(errorMessage);
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, navigate, registerWithEmailPassword]);

  const handleResendVerification = useCallback(async () => {
    try {
      setResendingVerification(true);
      setError('');
      await sendVerificationEmail();
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send verification email');
      console.error('Resend verification error:', err);
    } finally {
      setResendingVerification(false);
    }
  }, [sendVerificationEmail]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await resetPassword(email);
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch (err) {
      const errorMessage = AUTH_ERROR_MESSAGES[err.code] || err.message || 'Failed to send password reset email';
      setError(errorMessage);
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  }, [email, resetPassword]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#E5F0FF' }}>
      <div className="max-w-md w-full">
        {/* Main Card */}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Turbo ERP</h1>
            <p className="text-gray-600">
              {mode === 'login' ? 'Sign in to continue to your account' : 'Create your account'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
                setShowVerificationMessage(false);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError('');
                setSuccess('');
                setShowVerificationMessage(false);
              }}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Register
            </button>
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

          {/* Email Verification Message */}
          {showVerificationMessage && currentUser && !currentUser.emailVerified && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                Please verify your email address. Check your inbox for the verification link.
              </p>
              <button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline disabled:opacity-50"
              >
                {resendingVerification ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={mode === 'login' ? handleEmailPasswordLogin : handleEmailPasswordRegister} className="mb-6">
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Confirm Password Input (Register mode only) */}
              {mode === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              )}

              {/* Forgot Password Link (Login mode only) */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Registering...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 font-medium group-hover:text-gray-900">
              Continue with Google
            </span>
          </button>

          {/* Info Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

