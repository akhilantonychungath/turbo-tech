import { useMemo } from 'react';
import { applyFilters } from '../utils/filterUtils';
import { sortItems } from '../utils/sortUtils';

/**
 * Custom hook for filtering and sorting lists
 * @param {Array} items - Array of items to filter and sort
 * @param {Object} options - Configuration options
 * @returns {Object} Filtered and sorted items, and helper functions
 */
export const useFilteredList = (items = [], options = {}) => {
  const {
    searchQuery = '',
    searchFields = [],
    sortBy = 'newest',
    sortOptions = {},
    fieldFilters = {}
  } = options;

  const filteredAndSorted = useMemo(() => {
    // Apply filters
    const filtered = applyFilters(items, {
      searchQuery,
      searchFields,
      fieldFilters
    });

    // Apply sorting
    return sortItems(filtered, sortBy, sortOptions);
  }, [items, searchQuery, sortBy, searchFields, fieldFilters]);

  return {
    filteredItems: filteredAndSorted,
    count: filteredAndSorted.length,
    totalCount: items.length
  };
};

