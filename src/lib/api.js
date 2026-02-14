/**
 * API fetch wrapper that adds authentication headers
 * Uses Firebase auth token in production, dev email header in development
 */
import { auth } from './firebase';

/**
 * Fetch wrapper that automatically adds auth headers
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const apiFetch = async (url, options = {}) => {
  const headers = {
    ...options.headers,
  };

  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Add authentication headers for API endpoints
  if (url.includes('/api/')) {
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        // Always try to send the Firebase ID token (works in both dev and prod)
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      } catch {
        // Token retrieval failed - fall through to dev bypass below
      }

      // In development, also send x-dev-user-email as fallback
      if (import.meta.env.DEV && currentUser.email) {
        headers['x-dev-user-email'] = currentUser.email;
      }
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};

/**
 * Fetch JSON from an API endpoint with dev auth support
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export const apiFetchJson = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};
