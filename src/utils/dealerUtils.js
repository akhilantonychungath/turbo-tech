/**
 * Utility functions for dealer operations
 */

import { formatDate } from './dateUtils';

/**
 * Creates a map of transactionId to user data for quick lookup
 * @param {Array} users - Array of user objects
 * @returns {Map} Map of transactionId to user data
 */
export const createUserMap = (users) => {
  const map = new Map();
  users.forEach(user => {
    if (user.transactionId) {
      map.set(user.transactionId, {
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        whatsappNumber: user.whatsappNumber || ''
      });
    }
  });
  return map;
};

/**
 * Gets dealer display name from dealer data and user map
 * @param {Object} dealer - Dealer object
 * @param {Map} userMap - Map of transactionId to user data
 * @returns {string} Dealer display name
 */
export const getDealerDisplayName = (dealer, userMap) => {
  if (dealer.showroomName) {
    return dealer.showroomName;
  }
  if (dealer.dealerNameTransactionId) {
    const user = userMap.get(dealer.dealerNameTransactionId);
    if (user?.name) {
      return user.name;
    }
  }
  return dealer.dealerName || 'N/A';
};

/**
 * Gets dealer phone number from dealer data and user map
 * @param {Object} dealer - Dealer object
 * @param {Map} userMap - Map of transactionId to user data
 * @returns {string} Phone number
 */
export const getDealerPhone = (dealer, userMap) => {
  if (dealer.phoneNumber) {
    return dealer.phoneNumber;
  }
  if (dealer.dealerNameTransactionId) {
    const user = userMap.get(dealer.dealerNameTransactionId);
    if (user?.phoneNumber) {
      return user.phoneNumber;
    }
  }
  return 'N/A';
};

/**
 * Gets dealer WhatsApp number from dealer data and user map
 * @param {Object} dealer - Dealer object
 * @param {Map} userMap - Map of transactionId to user data
 * @returns {string} WhatsApp number
 */
export const getDealerWhatsApp = (dealer, userMap) => {
  if (dealer.whatsapp) {
    return dealer.whatsapp;
  }
  if (dealer.dealerNameTransactionId) {
    const user = userMap.get(dealer.dealerNameTransactionId);
    if (user?.whatsappNumber) {
      return user.whatsappNumber;
    }
  }
  return 'N/A';
};

/**
 * Formats a dealer date field
 * @param {Object|Date|string} date - Date value from dealer
 * @returns {string} Formatted date string
 */
export const formatDealerDate = (date) => {
  if (!date) return 'N/A';
  if (date?.toDate) {
    return formatDate(date.toDate());
  }
  return formatDate(new Date(date));
};

/**
 * Sorts dealers based on sort option
 * @param {Array} dealers - Array of dealer objects
 * @param {string} sortBy - Sort option ('newest', 'oldest', 'name-asc', 'name-desc')
 * @param {Map} userMap - Map of transactionId to user data
 * @returns {Array} Sorted dealers array
 */
export const sortDealers = (dealers, sortBy, userMap) => {
  const sorted = [...dealers];
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
    
    case 'oldest':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateA - dateB;
      });
    
    case 'name-asc':
      return sorted.sort((a, b) => {
        const nameA = getDealerDisplayName(a, userMap);
        const nameB = getDealerDisplayName(b, userMap);
        return nameA.localeCompare(nameB);
      });
    
    case 'name-desc':
      return sorted.sort((a, b) => {
        const nameA = getDealerDisplayName(a, userMap);
        const nameB = getDealerDisplayName(b, userMap);
        return nameB.localeCompare(nameA);
      });
    
    default:
      return sorted;
  }
};

/**
 * Filters dealers based on search query
 * @param {Array} dealers - Array of dealer objects
 * @param {string} searchQuery - Search query string
 * @param {Map} userMap - Map of transactionId to user data
 * @returns {Array} Filtered dealers array
 */
export const filterDealers = (dealers, searchQuery, userMap) => {
  if (!searchQuery.trim()) {
    return dealers;
  }
  
  const query = searchQuery.toLowerCase();
  return dealers.filter(dealer => {
    const dealerName = getDealerDisplayName(dealer, userMap).toLowerCase();
    const showroomName = dealer.showroomName?.toLowerCase() || '';
    const location = dealer.location?.toLowerCase() || '';
    const district = dealer.district?.toLowerCase() || '';
    
    return dealerName.includes(query) ||
           showroomName.includes(query) ||
           location.includes(query) ||
           district.includes(query);
  });
};

