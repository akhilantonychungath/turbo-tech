import React from 'react';

const SuccessMessage = ({ message, className = '' }) => {
  if (!message) return null;
  
  return (
    <div className={`mb-6 p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <p className="text-sm text-green-600">{message}</p>
    </div>
  );
};

export default SuccessMessage;

