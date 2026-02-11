import { useState, useCallback } from 'react';
import { showError, showSuccess, showLoading, dismissToast } from './toast';

/**
 * Custom hook for standardized async operation handling
 * Manages loading states, errors, and success notifications
 * 
 * @param {object} options - Configuration options
 * @returns {object} { executeAsync, loading, error, clearError }
 * 
 * Example usage:
 * const { executeAsync, loading, error } = useAsync();
 * 
 * const handleSubmit = async () => {
 *   await executeAsync(async () => {
 *     const response = await fetch('/api/data');
 *     const data = await response.json();
 *     return data;
 *   }, {
 *     successMessage: 'Data saved successfully',
 *     errorMessage: 'Failed to save data'
 *   });
 * };
 */
export function useAsync(options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Execute an async operation with error handling and loading state
   * @param {function} asyncFn - Async function to execute
   * @param {object} options - Options for this specific operation
   * @returns {Promise<any>} Result from asyncFn
   */
  const executeAsync = useCallback(async (asyncFn, operationOptions = {}) => {
    const {
      successMessage = null,
      errorMessage = 'An error occurred',
      showLoading: shouldShowLoading = false,
      onSuccess = null,
      onError = null,
      throwOnError = false
    } = { ...options, ...operationOptions };

    let loadingToast = null;

    try {
      setLoading(true);
      setError(null);

      if (shouldShowLoading) {
        loadingToast = showLoading('Processing...');
      }

      const result = await asyncFn();

      if (loadingToast) {
        dismissToast(loadingToast);
      }

      if (successMessage) {
        showSuccess(successMessage);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      if (loadingToast) {
        dismissToast(loadingToast);
      }

      console.error('Async operation error:', err);
      
      const errorMsg = err.message || err.error || errorMessage;
      setError(errorMsg);
      
      showError(errorMsg);

      if (onError) {
        onError(err);
      }

      if (throwOnError) {
        throw err;
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { executeAsync, loading, error, clearError };
}

/**
 * Custom hook for form handling with validation
 * @param {object} initialValues - Initial form values
 * @param {function} onSubmit - Submit handler
 * @param {function} validate - Validation function
 * @returns {object} Form handling utilities
 * 
 * Example:
 * const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm(
 *   { name: '', email: '' },
 *   async (values) => {
 *     await saveData(values);
 *   },
 *   (values) => {
 *     const errors = {};
 *     if (!values.name) errors.name = 'Name is required';
 *     if (!values.email) errors.email = 'Email is required';
 *     return errors;
 *   }
 * );
 */
export function useForm(initialValues, onSubmit, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    if (validate) {
      const validationErrors = validate(values);
      if (validationErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: validationErrors[name] }));
      }
    }
  }, [values, validate]);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate
    let validationErrors = {};
    if (validate) {
      validationErrors = validate(values);
      setErrors(validationErrors);
    }

    // Don't submit if there are errors
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      showError(firstError);
      return;
    }

    // Submit
    try {
      setIsSubmitting(true);
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
      showError(error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors
  };
}

/**
 * Custom hook for data fetching with caching
 * @param {string} key - Cache key
 * @param {function} fetchFn - Function to fetch data
 * @param {object} options - Options { enabled, refetchInterval, onSuccess, onError }
 * @returns {object} { data, loading, error, refetch }
 */
export function useFetch(key, fetchFn, options = {}) {
  const {
    enabled = true,
    refetchInterval = null,
    onSuccess = null,
    onError = null
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFn();
      setData(result);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error(`Fetch error [${key}]:`, err);
      setError(err.message || 'Failed to fetch data');

      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, enabled, onSuccess, onError]);

  // Initial fetch
  useState(() => {
    fetchData();
  }, []);

  // Auto refetch interval
  useState(() => {
    if (refetchInterval && enabled) {
      const intervalId = setInterval(fetchData, refetchInterval);
      return () => clearInterval(intervalId);
    }
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

export default {
  useAsync,
  useForm,
  useFetch
};
