import React, { useState, useRef, useEffect, useMemo } from 'react';

const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select...',
  label = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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

  // Reset search when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(opt => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const handleToggle = (value) => {
    const isSelected = selectedValues.includes(value);
    let newSelected;
    if (isSelected) {
      newSelected = selectedValues.filter(val => val !== value);
    } else {
      newSelected = [...selectedValues, value];
    }
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    // Only select all within the currently filtered options
    const filteredVals = filteredOptions.map(o => o.value);
    const newSelected = [...new Set([...selectedValues, ...filteredVals])];
    onChange(newSelected);
  };

  const handleClearAll = () => {
    // Clear only the currently filtered options if search is active, or clear everything
    if (searchQuery.trim()) {
      const filteredVals = filteredOptions.map(o => o.value);
      const newSelected = selectedValues.filter(val => !filteredVals.includes(val));
      onChange(newSelected);
    } else {
      onChange([]);
    }
  };

  const handleRemoveChip = (e, value) => {
    e.stopPropagation();
    onChange(selectedValues.filter(val => val !== value));
  };

  // Render selected items trigger view
  const renderTriggerContent = () => {
    if (selectedValues.length === 0) {
      return <span className="text-gray-400 text-sm truncate">{placeholder}</span>;
    }

    // Find the labels for selected options
    const selectedLabels = selectedValues
      .map(val => options.find(opt => opt.value === val)?.label)
      .filter(Boolean);

    if (selectedLabels.length <= 2) {
      return (
        <div className="flex flex-wrap gap-1 items-center max-w-full overflow-hidden">
          {selectedLabels.map((lbl, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800"
            >
              <span className="truncate max-w-[80px]">{lbl}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveChip(e, selectedValues[idx])}
                className="text-blue-500 hover:text-blue-700 font-bold focus:outline-none flex items-center justify-center rounded-full hover:bg-blue-200 w-3.5 h-3.5"
              >
                <span className="material-symbols-outlined text-[10px]">close</span>
              </button>
            </span>
          ))}
        </div>
      );
    }

    return (
      <span className="text-blue-800 text-sm font-semibold truncate bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
        {selectedValues.length} Selected
      </span>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">{label}</label>}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] px-3.5 py-1.5 border border-gray-300 rounded-xl bg-white text-left focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-between gap-2 shadow-sm hover:border-gray-400 outline-none"
      >
        <div className="flex-1 min-w-0 overflow-hidden flex items-center">
          {renderTriggerContent()}
        </div>
        <span className="flex-shrink-0 flex items-center text-gray-400">
          <span className={`material-symbols-outlined transition-transform duration-200 text-lg ${isOpen ? 'rotate-180' : ''}`}>
            keyboard_arrow_down
          </span>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[320px] transform origin-top transition-all duration-200">
          {/* Search box & Actions bar */}
          <div className="p-2 border-b border-gray-100 bg-gray-50 flex flex-col gap-2">
            <div className="relative">
              <span className="material-symbols-outlined text-gray-400 text-sm absolute left-2.5 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between text-xs px-1 text-gray-500">
              <button
                type="button"
                onClick={handleSelectAll}
                className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                {searchQuery.trim() ? 'Clear Search Results' : 'Clear All'}
              </button>
            </div>
          </div>

          {/* Options list */}
          <div className="flex-1 overflow-y-auto py-1 max-h-[200px] scrollbar-thin scrollbar-thumb-gray-200">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option.value)}
                    className="w-full px-3.5 py-2 text-left hover:bg-blue-50/50 flex items-center gap-3 transition-colors group focus:outline-none"
                  >
                    <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 transition-colors duration-150 ${
                      isChecked
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white group-hover:border-blue-400'
                    }`}>
                      {isChecked && (
                        <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                      )}
                    </div>
                    <span className={`text-sm select-none truncate ${
                      isChecked ? 'text-gray-900 font-semibold' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
