import React from 'react';

const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;
  
  return (
    <div className={`mb-6 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
};

export default ErrorMessage;

