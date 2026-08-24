/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Formats a Firestore timestamp or date to a localized date string
 * @param {Object|Date|string} date - Firestore timestamp, Date object, or date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  let dateObj;
  
  if (date?.toDate) {
    // Firestore Timestamp
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    return 'N/A';
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'N/A';
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString(undefined, defaultOptions);
};

/**
 * Formats a Firestore timestamp or date to a localized date and time string
 * @param {Object|Date|string} date - Firestore timestamp, Date object, or date string
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Converts a Firestore timestamp or date to a Date object
 * @param {Object|Date|string} date - Firestore timestamp, Date object, or date string
 * @returns {Date|null} Date object or null if invalid
 */
export const toDate = (date) => {
  if (!date) return null;
  
  if (date?.toDate) {
    return date.toDate();
  }
  
  if (date instanceof Date) {
    return date;
  }
  
  const dateObj = new Date(date);
  return isNaN(dateObj.getTime()) ? null : dateObj;
};

