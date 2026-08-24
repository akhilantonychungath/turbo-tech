import React from 'react';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  message, 
  actionLabel, 
  onAction,
  className = '' 
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className={`${React.isValidElement(Icon) ? '' : 'w-16 h-16'} text-gray-400 mx-auto mb-4`}>
          {typeof Icon === 'string' ? (
            <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={Icon} />
            </svg>
          ) : React.isValidElement(Icon) ? (
            Icon
          ) : (
            <Icon className="w-full h-full" />
          )}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

