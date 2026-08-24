/**
 * Utility functions for generating unique identifiers
 */

/**
 * Generates a unique transaction ID
 * Format: TXN-{timestamp}-{randomString}
 * @returns {string} Unique transaction ID
 */
export const generateTransactionId = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-${timestamp}-${randomString}`;
};

