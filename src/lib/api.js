/**
 * API fetch wrapper that adds dev authentication headers
 * In development mode (when NODE_ENV is not set to production),
 * it can use the x-dev-user-email header for testing protected endpoints
 */

const DEV_USER_EMAIL = 'lodhaatelier@gmail.com'; // Super admin for testing

/**
 * Fetch wrapper that automatically adds dev auth headers if needed
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

  // In development, add x-dev-user-email header for protected endpoints
  // This allows testing protected APIs without Firebase auth configured
  if (import.meta.env.DEV && url.includes('/api/')) {
    headers['x-dev-user-email'] = DEV_USER_EMAIL;
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
