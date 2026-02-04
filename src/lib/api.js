/**
 * API fetch wrapper that adds authentication headers
 * Uses Firebase auth token when available, falls back to dev email header
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

  // In development mode, add x-dev-user-email header for protected endpoints
  // Use the current Firebase user's email if authenticated
  if (import.meta.env.DEV && url.includes('/api/')) {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email) {
      headers['x-dev-user-email'] = currentUser.email;
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
