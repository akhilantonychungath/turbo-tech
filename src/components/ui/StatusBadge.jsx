import React from 'react';

const StatusBadge = ({ status, isBlocked }) => {
  const getStatusConfig = () => {
    if (isBlocked || status === 'blocked') {
      return {
        label: 'Blocked',
        className: 'bg-red-100 text-red-800'
      };
    }
    
    if (status === 'approved') {
      return {
        label: 'Active',
        className: 'bg-green-100 text-green-800'
      };
    }
    
    return {
      label: 'Pending for approval',
      className: 'bg-yellow-100 text-yellow-800'
    };
  };

  const config = getStatusConfig();

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;

