import React from 'react';

const DeleteConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  itemName, 
  warningMessage, 
  footerMessage,
  canDelete = true,
  actions,
  theme = 'red', // 'red', 'yellow', 'blue', etc.
  icon
}) => {
  if (!isOpen) return null;

  // Theme configurations
  const themes = {
    red: {
      headerBg: 'bg-red-50',
      headerBorder: 'border-red-100',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      warningBg: 'bg-yellow-50',
      warningBorder: 'border-yellow-200',
      warningText: 'text-yellow-800',
      warningIcon: 'text-yellow-600',
      footerMessage: 'text-red-600'
    },
    yellow: {
      headerBg: 'bg-yellow-50',
      headerBorder: 'border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      warningBg: 'bg-yellow-50',
      warningBorder: 'border-yellow-200',
      warningText: 'text-yellow-800',
      warningIcon: 'text-yellow-600',
      footerMessage: 'text-yellow-600'
    },
    blue: {
      headerBg: 'bg-blue-50',
      headerBorder: 'border-blue-100',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      warningBg: 'bg-yellow-50',
      warningBorder: 'border-yellow-200',
      warningText: 'text-yellow-800',
      warningIcon: 'text-yellow-600',
      footerMessage: 'text-blue-600'
    }
  };

  const currentTheme = themes[theme] || themes.red;

  // Default icon if not provided
  const defaultIcon = icon || (
    <svg className={`w-6 h-6 ${currentTheme.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  // Default actions if not provided
  const defaultActions = actions || [
    {
      label: canDelete ? 'Cancel' : 'Close',
      onClick: onClose,
      variant: 'secondary'
    },
    ...(canDelete ? [{
      label: 'Delete',
      onClick: onConfirm,
      variant: 'danger'
    }] : [])
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full transform transition-all">
          {/* Header */}
          <div className={`px-6 py-4 rounded-t-xl border-b ${currentTheme.headerBg} ${currentTheme.headerBorder}`}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentTheme.iconBg}`}>
                  {defaultIcon}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {message && (
              <p className="text-sm text-gray-600 mb-4">
                {message}
              </p>
            )}
            {itemName && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-900">{itemName}</p>
              </div>
            )}
            {warningMessage && (
              <div className={`${currentTheme.warningBg} border ${currentTheme.warningBorder} rounded-lg p-3 mb-4`}>
                <div className="flex items-start gap-2">
                  <svg className={`w-5 h-5 ${currentTheme.warningIcon} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className={`text-sm ${currentTheme.warningText} font-medium`}>{warningMessage}</p>
                </div>
              </div>
            )}
            {footerMessage && canDelete && (
              <p className={`text-sm ${currentTheme.footerMessage} font-medium`}>
                {footerMessage}
              </p>
            )}
            {!footerMessage && canDelete && (
              <p className={`text-sm ${currentTheme.footerMessage} font-medium`}>
                This action cannot be undone.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
            {defaultActions.map((action, index) => {
              const buttonClasses = {
                secondary: "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200",
                danger: "px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200",
                primary: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200",
                warning: "px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200"
              };

              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={buttonClasses[action.variant] || buttonClasses.secondary}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;
