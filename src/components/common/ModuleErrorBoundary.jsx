import React from 'react';

/**
 * Error Boundary for Module Loading
 * 
 * Catches errors during module loading and provides a user-friendly error message.
 * Also logs security violations for unauthorized module load attempts.
 */
class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Module loading error:', error, errorInfo);
    
    // Check if this is a security-related error
    if (error.code === 'UNAUTHORIZED_AUTH' || 
        error.code === 'UNAUTHORIZED_PERMISSION' ||
        error.code === 'UNAUTHORIZED_EMAIL' ||
        error.code === 'UNAUTHORIZED_STATUS') {
      console.warn('[Security] Unauthorized module load attempt blocked:', {
        error: error.message,
        code: error.code,
        path: window.location.pathname,
        timestamp: new Date().toISOString(),
        stack: error.stack,
      });
    }

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const isSecurityError = error?.code?.startsWith('UNAUTHORIZED');

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 px-4">
          <div className="max-w-md w-full text-center p-6">
            <div className="text-red-600 text-6xl mb-4">
              {isSecurityError ? '🔒' : '⚠️'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isSecurityError ? 'Access Denied' : 'Module Load Error'}
            </h2>
            <p className="text-gray-600 mb-4">
              {isSecurityError 
                ? 'You do not have permission to access this module. Unauthorized module load attempts are logged for security purposes.'
                : 'An error occurred while loading this module. Please try refreshing the page.'}
            </p>
            {error?.message && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error.message}</p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;

