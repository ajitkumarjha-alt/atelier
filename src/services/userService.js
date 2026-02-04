/**
 * Create or update a user in the database
 * @param {string} email - User's email address
 * @param {string} fullName - User's display name
 * @returns {Promise<Object>} The created/updated user object
 */
export const createOrUpdateUser = async (email, fullName) => {
  try {
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, fullName }),
    });

    if (response.status === 403) {
      // Non-registered user
      return { error: 'Not registered', user_level: null, is_active: false };
    }

    if (!response.ok) {
      throw new Error('Failed to sync user data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    throw error;
  }
};