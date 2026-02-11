/**
 * Input Validation Utilities
 * Centralized validation functions for form inputs and API parameters
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  return { isValid: true, value: trimmedEmail.toLowerCase() };
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {string} countryCode - Optional country code (default: 'IN')
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validatePhone(phone, countryCode = 'IN') {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  if (countryCode === 'IN') {
    // Indian phone numbers: 10 digits
    if (digits.length !== 10) {
      return { isValid: false, error: 'Phone number must be 10 digits' };
    }
    if (!digits.match(/^[6-9]\d{9}$/)) {
      return { isValid: false, error: 'Invalid Indian phone number format' };
    }
  } else {
    // Generic validation: 7-15 digits
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, error: 'Phone number must be 7-15 digits' };
    }
  }

  return { isValid: true, value: digits };
}

/**
 * Validate required string field
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field (for error messages)
 * @param {object} options - Validation options { minLength, maxLength, pattern }
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateRequired(value, fieldName, options = {}) {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }

  if (options.minLength && trimmedValue.length < options.minLength) {
    return { 
      isValid: false, 
      error: `${fieldName} must be at least ${options.minLength} characters` 
    };
  }

  if (options.maxLength && trimmedValue.length > options.maxLength) {
    return { 
      isValid: false, 
      error: `${fieldName} must not exceed ${options.maxLength} characters` 
    };
  }

  if (options.pattern && !options.pattern.test(trimmedValue)) {
    return { 
      isValid: false, 
      error: options.patternError || `${fieldName} has invalid format` 
    };
  }

  return { isValid: true, value: trimmedValue };
}

/**
 * Validate number field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @param {object} options - Validation options { min, max, integer }
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateNumber(value, fieldName, options = {}) {
  const num = Number(value);

  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }

  if (options.integer && !Number.isInteger(num)) {
    return { isValid: false, error: `${fieldName} must be an integer` };
  }

  if (options.min !== undefined && num < options.min) {
    return { isValid: false, error: `${fieldName} must be at least ${options.min}` };
  }

  if (options.max !== undefined && num > options.max) {
    return { isValid: false, error: `${fieldName} must not exceed ${options.max}` };
  }

  return { isValid: true, value: num };
}

/**
 * Validate date field
 * @param {any} value - Date value to validate
 * @param {string} fieldName - Name of the field
 * @param {object} options - Validation options { min, max, future, past }
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateDate(value, fieldName, options = {}) {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} must be a valid date` };
  }

  const now = new Date();

  if (options.future && date <= now) {
    return { isValid: false, error: `${fieldName} must be in the future` };
  }

  if (options.past && date >= now) {
    return { isValid: false, error: `${fieldName} must be in the past` };
  }

  if (options.min && date < new Date(options.min)) {
    return { isValid: false, error: `${fieldName} must be after ${options.min}` };
  }

  if (options.max && date > new Date(options.max)) {
    return { isValid: false, error: `${fieldName} must be before ${options.max}` };
  }

  return { isValid: true, value: date };
}

/**
 * Validate enum/select field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field
 * @param {array} allowedValues - Array of allowed values
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateEnum(value, fieldName, allowedValues) {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (!allowedValues.includes(value)) {
    return { 
      isValid: false, 
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
    };
  }

  return { isValid: true, value };
}

/**
 * Sanitize string input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate file upload
 * @param {object} file - File object from multer
 * @param {object} options - Validation options { maxSize, allowedTypes }
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateFile(file, options = {}) {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Default max size: 10MB
  const maxSize = options.maxSize || 10 * 1024 * 1024;

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return { 
      isValid: false, 
      error: `File size must not exceed ${maxSizeMB}MB` 
    };
  }

  if (options.allowedTypes && options.allowedTypes.length > 0) {
    const fileType = file.mimetype || file.type;
    const fileExt = file.originalname?.split('.').pop()?.toLowerCase();

    const isTypeAllowed = options.allowedTypes.some(type => {
      if (type.includes('/')) {
        // MIME type check
        return fileType === type || fileType?.startsWith(type.replace('*', ''));
      } else {
        // Extension check
        return fileExt === type.toLowerCase();
      }
    });

    if (!isTypeAllowed) {
      return { 
        isValid: false, 
        error: `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}` 
      };
    }
  }

  return { isValid: true, value: file };
}

/**
 * Validate multiple fields at once
 * @param {object} validations - Object with field validations
 * @returns {object} { isValid: boolean, errors: object }
 * 
 * Example:
 * validateFields({
 *   email: () => validateEmail(email),
 *   name: () => validateRequired(name, 'Name', { minLength: 2 }),
 *   age: () => validateNumber(age, 'Age', { min: 18, max: 100 })
 * })
 */
export function validateFields(validations) {
  const errors = {};
  let isValid = true;

  for (const [field, validationFn] of Object.entries(validations)) {
    const result = validationFn();
    if (!result.isValid) {
      errors[field] = result.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

export default {
  validateEmail,
  validatePhone,
  validateRequired,
  validateNumber,
  validateDate,
  validateEnum,
  sanitizeInput,
  validateFile,
  validateFields
};
