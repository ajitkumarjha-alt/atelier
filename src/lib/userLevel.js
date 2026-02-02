/**
 * Utility functions for user level management
 */

const SUPER_ADMIN_CONTEXT_KEY = 'superAdminContext';

/**
 * Set the dashboard context for SUPER_ADMIN
 * This is called when navigating to a specific level dashboard
 * 
 * @param {string} level - The user level (L0, L1, L2, etc.)
 */
export const setSuperAdminContext = (level) => {
  if (level) {
    sessionStorage.setItem(SUPER_ADMIN_CONTEXT_KEY, level);
  } else {
    sessionStorage.removeItem(SUPER_ADMIN_CONTEXT_KEY);
  }
};

/**
 * Get the current SUPER_ADMIN context from sessionStorage
 * 
 * @returns {string|null} The stored context level or null
 */
export const getSuperAdminContext = () => {
  return sessionStorage.getItem(SUPER_ADMIN_CONTEXT_KEY);
};

/**
 * Clear the SUPER_ADMIN context
 */
export const clearSuperAdminContext = () => {
  sessionStorage.removeItem(SUPER_ADMIN_CONTEXT_KEY);
};

/**
 * Get the effective user level based on current route and stored context
 * For SUPER_ADMIN, if they're on a specific level dashboard, treat them as that level
 * This is useful for debugging and testing
 * 
 * @param {string} actualUserLevel - The user's actual user level from database
 * @param {string} currentPath - The current route path (window.location.pathname)
 * @returns {string} The effective user level to use for permission checks
 */
export const getEffectiveUserLevel = (actualUserLevel, currentPath) => {
  console.log('getEffectiveUserLevel called:', { actualUserLevel, currentPath });
  
  // If not SUPER_ADMIN, return their actual level
  if (actualUserLevel !== 'SUPER_ADMIN') {
    console.log('Not SUPER_ADMIN, returning actual level:', actualUserLevel);
    return actualUserLevel;
  }

  // For SUPER_ADMIN, check which dashboard they're on and store the context
  if (currentPath.includes('/l0-dashboard')) {
    setSuperAdminContext('L0');
    console.log('On L0 dashboard, setting context to L0');
    return 'L0';
  } else if (currentPath.includes('/l1-dashboard')) {
    setSuperAdminContext('L1');
    console.log('On L1 dashboard, setting context to L1');
    return 'L1';
  } else if (currentPath.includes('/l2-dashboard')) {
    setSuperAdminContext('L2');
    console.log('On L2 dashboard, setting context to L2');
    return 'L2';
  } else if (currentPath.includes('/l3-dashboard')) {
    setSuperAdminContext('L3');
    console.log('On L3 dashboard, setting context to L3');
    return 'L3';
  } else if (currentPath.includes('/l4-dashboard')) {
    setSuperAdminContext('L4');
    console.log('On L4 dashboard, setting context to L4');
    return 'L4';
  } else if (currentPath.includes('/vendor-dashboard')) {
    setSuperAdminContext('VENDOR');
    console.log('On Vendor dashboard, setting context to VENDOR');
    return 'VENDOR';
  } else if (currentPath.includes('/cm-dashboard')) {
    setSuperAdminContext('CM');
    console.log('On CM dashboard, setting context to CM');
    return 'CM';
  } else if (currentPath.includes('/super-admin-dashboard')) {
    // On super-admin dashboard, clear context to return to full access
    clearSuperAdminContext();
    console.log('On super-admin dashboard, clearing context');
    return 'SUPER_ADMIN';
  }

  // If on any other route, check if there's a stored context
  const storedContext = getSuperAdminContext();
  console.log('Not on dashboard, checking stored context:', storedContext);
  if (storedContext) {
    return storedContext;
  }

  // If no context is stored, return SUPER_ADMIN
  console.log('No stored context, returning SUPER_ADMIN');
  return 'SUPER_ADMIN';
};

/**
 * Check if user can create/edit calculations
 * L2 and above (including L1, SUPER_ADMIN) can create/edit
 * 
 * @param {string} effectiveUserLevel - The effective user level
 * @returns {boolean} True if user can create/edit
 */
export const canCreateEditCalculations = (effectiveUserLevel) => {
  return effectiveUserLevel === 'SUPER_ADMIN' || 
         effectiveUserLevel === 'L1' || 
         effectiveUserLevel === 'L2';
};
