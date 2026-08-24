/**
 * Utility functions for filtering arrays
 */

/**
 * Filters items by search query across multiple fields
 * @param {Array} items - Array of items to filter
 * @param {string} searchQuery - Search query string
 * @param {Array<string>} fields - Field names to search in
 * @returns {Array} Filtered array
 */
export const filterBySearch = (items, searchQuery, fields = []) => {
  if (!searchQuery || !searchQuery.trim()) {
    return items;
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return items.filter(item =>
    fields.some(field => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(query);
    })
  );
};

/**
 * Filters items by a specific field value
 * @param {Array} items - Array of items to filter
 * @param {string} field - Field name to filter by
 * @param {*} value - Value to match (empty string means no filter)
 * @returns {Array} Filtered array
 */
export const filterByField = (items, field, value) => {
  if (!value || value === '') {
    return items;
  }
  
  return items.filter(item => item[field] === value);
};

/**
 * Combines multiple filters
 * @param {Array} items - Array of items to filter
 * @param {Object} filters - Object with filter configurations
 * @returns {Array} Filtered array
 */
export const applyFilters = (items, filters) => {
  let filtered = items;
  
  // Apply search filter
  if (filters.searchQuery && filters.searchFields) {
    filtered = filterBySearch(filtered, filters.searchQuery, filters.searchFields);
  }
  
  // Apply field filters
  if (filters.fieldFilters) {
    Object.entries(filters.fieldFilters).forEach(([field, value]) => {
      if (value !== undefined && value !== '') {
        filtered = filterByField(filtered, field, value);
      }
    });
  }
  
  return filtered;
};

