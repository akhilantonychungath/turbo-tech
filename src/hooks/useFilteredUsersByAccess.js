import { useState, useEffect, useMemo } from 'react';
import { useFirestoreCollection } from './useFirestoreCollection';

/**
 * Custom hook to fetch users filtered by userType and/or roleName
 * @param {string} userType - Optional filter by userType ('inside' or 'outside')
 * @param {string} roleName - Optional filter by roleName (e.g., 'Dealer Staff')
 * @returns {Object} Filtered users, loading state, and error
 */
export const useFilteredUsersByAccess = (userType = null, roleName = null) => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all users
  const { items: users, loading: usersLoading } = useFirestoreCollection('users', {
    orderByField: 'name',
    orderDirection: 'asc',
    autoFetch: true
  });

  // Fetch all user roles
  const { items: userRoles, loading: rolesLoading } = useFirestoreCollection('userRoles', {
    orderByField: 'roleName',
    orderDirection: 'asc',
    autoFetch: true
  });

  // Filter users based on userType and/or roleName
  useEffect(() => {
    const filterUsers = async () => {
      if (usersLoading || rolesLoading) {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const filtered = [];

        for (const user of users) {
          // Skip users without a role
          if (!user.userRoleId) continue;

          // Find the user's role
          const userRole = userRoles.find(role => role.id === user.userRoleId);
          if (!userRole) continue;

          // Filter by userType if specified
          if (userType && userRole.userType !== userType) continue;

          // Filter by roleName if specified
          if (roleName && userRole.roleName !== roleName) continue;

          // Only include users who have a transactionId
          if (user.transactionId) {
            // Attach role information to the user object
            filtered.push({
              ...user,
              roleName: userRole.roleName || ''
            });
          }
        }

        // Sort by name
        filtered.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setFilteredUsers(filtered);
      } catch (err) {
        console.error('Error filtering users:', err);
        setError('Failed to load users. Please try again.');
        setFilteredUsers([]);
      } finally {
        setLoading(false);
      }
    };

    filterUsers();
  }, [users, userRoles, userType, roleName, usersLoading, rolesLoading]);

  return {
    filteredUsers,
    loading,
    error
  };
};

