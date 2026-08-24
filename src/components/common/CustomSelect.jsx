import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  required = false,
  name,
  showRoleChip = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => {
    const optValue = typeof opt === 'object' ? opt.value : opt;
    return optValue === value;
  });

  const handleSelect = (optionValue) => {
    onChange({
      target: {
        name: name,
        value: optionValue
      }
    });
    setIsOpen(false);
  };

  const displayValue = selectedOption
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed bg-white flex items-center justify-between ${
          !value ? 'text-gray-500' : 'text-gray-900'
        }`}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption && typeof selectedOption === 'object' && selectedOption.roleName && showRoleChip ? (
            <>
              <span className="truncate">{selectedOption.label}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap flex-shrink-0">
                {selectedOption.roleName}
              </span>
            </>
          ) : (
            <span className="truncate">{displayValue}</span>
          )}
        </span>
        <span className="ml-2 flex-shrink-0">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            options.map((option, index) => {
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              const isSelected = optionValue === value;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelect(optionValue)}
                  className={`w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm text-gray-700">{optionLabel}</span>
                      {typeof option === 'object' && option.roleName && showRoleChip && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                          {option.roleName}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {required && !value && (
        <input
          type="text"
          required
          className="sr-only"
          tabIndex={-1}
          value=""
          onChange={() => {}}
        />
      )}
    </div>
  );
};

export default CustomSelect;

