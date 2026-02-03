import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation result checker
 * Call this after validation rules to check for errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Common validation rules
 */
export const validations = {
  // Email validation
  email: () => body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),

  // Project validations
  projectName: () => body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Project name must be between 3 and 255 characters'),

  projectId: () => param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid project ID'),

  // User validations
  fullName: () => body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),

  userLevel: () => body('userLevel')
    .optional()
    .isIn(['L1', 'L2', 'L3', 'L4', 'SUPER_ADMIN'])
    .withMessage('Invalid user level'),

  // MAS validations
  materialName: () => body('materialName')
    .trim()
    .notEmpty()
    .withMessage('Material name is required')
    .isLength({ max: 255 })
    .withMessage('Material name too long'),

  quantity: () => body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),

  // RFI validations
  rfiSubject: () => body('rfiSubject')
    .trim()
    .notEmpty()
    .withMessage('RFI subject is required')
    .isLength({ max: 255 })
    .withMessage('RFI subject too long'),

  // Status validations
  status: (allowedStatuses) => body('status')
    .optional()
    .isIn(allowedStatuses)
    .withMessage(`Status must be one of: ${allowedStatuses.join(', ')}`),

  // Date validations
  date: (fieldName) => body(fieldName)
    .optional()
    .isISO8601()
    .withMessage(`${fieldName} must be a valid date`),

  // Pagination
  page: () => query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limit: () => query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // File upload
  category: () => body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),

  // Generic text
  text: (fieldName, options = {}) => {
    const { required = true, min = 1, max = 1000 } = options;
    let validation = body(fieldName).trim();
    
    if (required) {
      validation = validation.notEmpty().withMessage(`${fieldName} is required`);
    } else {
      validation = validation.optional();
    }
    
    return validation.isLength({ min, max })
      .withMessage(`${fieldName} must be between ${min} and ${max} characters`);
  }
};

/**
 * Validation rule sets for common operations
 */
export const validationRules = {
  createProject: [
    validations.projectName(),
    body('assignedLeadId').optional().isInt().withMessage('Invalid lead ID'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('targetCompletionDate').isISO8601().withMessage('Invalid target completion date'),
    validate
  ],

  updateProject: [
    validations.projectId(),
    validations.projectName(),
    validate
  ],

  createMAS: [
    validations.materialName(),
    body('projectId').isInt({ min: 1 }).withMessage('Invalid project ID'),
    validations.quantity(),
    validate
  ],

  createRFI: [
    validations.rfiSubject(),
    body('projectId').isInt({ min: 1 }).withMessage('Invalid project ID'),
    body('rfiDescription').trim().notEmpty().withMessage('RFI description is required'),
    validate
  ],

  userSync: [
    validations.email(),
    validations.fullName(),
    validate
  ],

  pagination: [
    validations.page(),
    validations.limit(),
    validate
  ]
};
