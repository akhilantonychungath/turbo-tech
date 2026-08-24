import React from 'react';

const UserCheckboxList = ({ 
  users, 
  selectedIds, 
  onToggle, 
  loading, 
  showRoleChip = true 
}) => {
  if (loading) {
    return <div className="text-sm text-gray-500 py-2">Loading users...</div>;
  }

  if (users.length === 0) {
    return <div className="text-sm text-gray-500 py-2">No users available</div>;
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto">
      {users.map((user) => {
        const transactionId = user.transactionId || user.id;
        const isSelected = Array.isArray(selectedIds) 
          ? selectedIds.some(id => String(id) === String(transactionId))
          : String(selectedIds) === String(transactionId);
        
        return (
          <label
            key={user.id}
            className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(transactionId)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-gray-700">
                {user.name || user.email || 'Unknown User'}
              </span>
              {showRoleChip && user.roleName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                  {user.roleName}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
};

export default UserCheckboxList;

