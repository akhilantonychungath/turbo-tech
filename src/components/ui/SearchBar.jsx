import React from 'react';

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  className = '',
  showClearButton = true 
}) => {
  return (
    <div className={`relative flex-1 w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="material-symbols-outlined h-5 w-5 text-gray-400">search</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white outline-none"
        placeholder={placeholder}
      />
      {showClearButton && value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          aria-label="Clear search"
        >
          <span className="material-symbols-outlined h-5 w-5 text-gray-400 hover:text-gray-600">close</span>
        </button>
      )}
    </div>
  );
};

export default SearchBar;

