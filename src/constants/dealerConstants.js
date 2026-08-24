/**
 * Constants for dealer-related functionality
 */

export const DEALER_TYPES = [
  { value: 'showroom', label: 'Showroom' },
  { value: 'home-sales', label: 'Home Sales' }
];

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram',
  'Kollam',
  'Pathanamthitta',
  'Alappuzha',
  'Kottayam',
  'Idukki',
  'Ernakulam',
  'Thrissur',
  'Palakkad',
  'Malappuram',
  'Kozhikode',
  'Wayanad',
  'Kannur',
  'Kasaragod'
].map(district => ({ value: district, label: district }));

export const ACCESS_MODES = [
  { value: 'offline', label: 'Offline' },
  { value: 'basic', label: 'Basic' },
  { value: 'advanced', label: 'Advanced' }
];

export const POTENTIAL_LEVELS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

export const DEALER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  BLOCKED: 'blocked'
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' }
];

export const DOCUMENT_TYPES = {
  ADHAR_CARD: 'adharCard',
  PANCARD: 'pancard',
  LICENSE: 'license',
  AGREEMENT: 'agreement'
};

export const FILE_ACCEPT_TYPES = 'image/*,.pdf';

