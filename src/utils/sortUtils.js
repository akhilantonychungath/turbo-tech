/**
 * Utility functions for sorting arrays
 */

/**
 * Sorts an array of items by date (newest or oldest)
 * @param {Array} items - Array of items to sort
 * @param {string} dateField - Field name containing the date
 * @param {string} order - 'newest' or 'oldest'
 * @returns {Array} Sorted array
 */
export const sortByDate = (items, dateField = 'createdAt', order = 'newest') => {
  return [...items].sort((a, b) => {
    const dateA = a[dateField]?.toDate 
      ? a[dateField].toDate() 
      : new Date(a[dateField] || 0);
    const dateB = b[dateField]?.toDate 
      ? b[dateField].toDate() 
      : new Date(b[dateField] || 0);
    
    return order === 'newest' ? dateB - dateA : dateA - dateB;
  });
};

/**
 * Sorts an array of items by name (A-Z or Z-A)
 * @param {Array} items - Array of items to sort
 * @param {string} nameField - Field name containing the name
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortByName = (items, nameField, order = 'asc') => {
  return [...items].sort((a, b) => {
    const nameA = (a[nameField] || '').toLowerCase();
    const nameB = (b[nameField] || '').toLowerCase();
    const comparison = nameA.localeCompare(nameB);
    return order === 'asc' ? comparison : -comparison;
  });
};

/**
 * Universal sort function that handles multiple sort types
 * @param {Array} items - Array of items to sort
 * @param {string} sortBy - Sort type: 'newest', 'oldest', 'name-asc', 'name-desc'
 * @param {Object} options - Additional options (dateField, nameField)
 * @returns {Array} Sorted array
 */
export const sortItems = (items, sortBy, options = {}) => {
  const { dateField = 'createdAt', nameField } = options;
  
  switch (sortBy) {
    case 'newest':
      return sortByDate(items, dateField, 'newest');
    case 'oldest':
      return sortByDate(items, dateField, 'oldest');
    case 'name-asc':
      return sortByName(items, nameField, 'asc');
    case 'name-desc':
      return sortByName(items, nameField, 'desc');
    default:
      return items;
  }
};

