import { toast } from 'react-hot-toast';

/**
 * Toast notification utility
 * Provides consistent toast notifications across the application
 */

export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#10B981',
      color: '#fff',
      fontFamily: 'Jost, sans-serif',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
    ...options,
  });
};

export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#EF4444',
      color: '#fff',
      fontFamily: 'Jost, sans-serif',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
    ...options,
  });
};

export const showInfo = (message, options = {}) => {
  return toast(message, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#3B82F6',
      color: '#fff',
      fontFamily: 'Jost, sans-serif',
    },
    ...options,
  });
};

export const showWarning = (message, options = {}) => {
  return toast(message, {
    duration: 3500,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#F59E0B',
      color: '#fff',
      fontFamily: 'Jost, sans-serif',
    },
    ...options,
  });
};

export const showLoading = (message = 'Loading...', options = {}) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#6D6E71',
      color: '#fff',
      fontFamily: 'Jost, sans-serif',
    },
    ...options,
  });
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};

// Promise-based toast for async operations
export const showPromise = (promise, messages, options = {}) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Error occurred',
    },
    {
      position: 'top-right',
      style: {
        fontFamily: 'Jost, sans-serif',
      },
      ...options,
    }
  );
};
