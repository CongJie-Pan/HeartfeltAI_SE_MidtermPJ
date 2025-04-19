/**
 * Request Validation Middleware
 * 
 * Implements input validation for API requests using express-validator.
 * Provides validation schemas for different endpoints and a handler
 * for processing validation results.
 * 
 * Express-validator is a set of express.js middlewares that wraps the
 * validator.js validator and sanitizer functions. It allows for easy
 * validation and sanitization of request data (body, params, query, etc.)
 * before processing requests.
 */
const { validationResult, body, param, query } = require('express-validator');
const logger = require('../config/logger');

/**
 * Validation Result Handler
 * 
 * Processes validation results from express-validator.
 * If validation passes, it allows the request to continue to the next middleware.
 * If validation fails, it logs the errors and returns a 400 Bad Request response.
 * 
 * The enhanced error logging provides detailed debug information including:
 * - Complete validation error details
 * - Request context information
 * - Data tracing for each validation error
 * - Formatted validation path for easier troubleshooting
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if validation fails
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Generate a unique error reference ID for tracking
    const errorRefId = generateErrorReference();
    
    // Create formatted errors with more detailed information
    const formattedErrors = errors.array().map((error, index) => {
      // Extract the relevant data for the error from the request
      const relevantData = extractRelevantData(req, error);
      
      // Create a structured error object with enhanced debug info
      return {
        index,
        field: error.param,
        location: error.location,
        value: error.value,
        message: error.msg,
        type: error.type,
        // Formatted path for nested fields (e.g., user.address.city)
        path: formatValidationPath(error),
        // Actual vs expected data comparison
        valueAnalysis: analyzeInvalidValue(error)
      };
    });
    
    // Gather complete request context for debugging
    const requestContext = {
      path: req.path,
      method: req.method,
      query: req.query,
      params: req.params,
      body: sanitizeRequestBody(req.body), // Remove sensitive data
      headers: sanitizeHeaders(req.headers), // Remove auth tokens
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      referer: req.get('Referer') || null,
      contentType: req.get('Content-Type'),
      sessionInfo: req.session ? { id: req.session.id } : null,
      referenceId: errorRefId
    };
    
    // Log detailed validation error with complete context
    logger.warn('Validation error detected', {
      errorRefId,
      errorCount: formattedErrors.length,
      endpointInfo: `${req.method} ${req.path}`,
      validationErrors: formattedErrors,
      requestContext,
      // Stack trace for debugging where validation was triggered
      stackTrace: new Error().stack
    });
    
    // Additional detailed debug logging for each error
    formattedErrors.forEach(error => {
      logger.debug(`Validation error details [${errorRefId}]`, {
        fieldPath: error.path,
        errorMessage: error.message,
        receivedValue: error.value,
        validationType: error.type,
        errorContext: error.valueAnalysis
      });
    });
    
    // Create user-friendly error messages
    const userErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    
    return res.status(400).json({
      message: '輸入資料有誤',
      errors: userErrors,
      referenceId: errorRefId // Include reference ID for support inquiries
    });
  }
  next();
};

/**
 * Generates a unique error reference ID for tracking
 * 
 * @returns {string} Unique error reference ID
 */
function generateErrorReference() {
  return `VAL-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
}

/**
 * Formats validation path for nested fields
 * Helps identify the exact location of validation errors in complex objects
 * 
 * @param {Object} error - Validation error object
 * @returns {string} Formatted path
 */
function formatValidationPath(error) {
  if (error.nestedErrors && error.nestedErrors.length > 0) {
    return `${error.param}.${error.nestedErrors[0].param}`;
  }
  return error.param;
}

/**
 * Extracts relevant data for the error from the request
 * 
 * @param {Object} req - Express request object
 * @param {Object} error - Validation error object
 * @returns {Object} Relevant data for the error
 */
function extractRelevantData(req, error) {
  // Get data from the appropriate location (body, params, query, etc.)
  const location = error.location || 'body';
  let data = {};
  
  if (location === 'body' && req.body) {
    data = req.body;
  } else if (location === 'params' && req.params) {
    data = req.params;
  } else if (location === 'query' && req.query) {
    data = req.query;
  } else if (location === 'headers' && req.headers) {
    data = req.headers;
  }
  
  return data;
}

/**
 * Analyzes invalid values to provide more context
 * Provides information about what was expected vs. what was received
 * 
 * @param {Object} error - Validation error object
 * @returns {Object} Analysis of the invalid value
 */
function analyzeInvalidValue(error) {
  let analysis = {
    received: error.value,
    expectedType: 'valid value'
  };
  
  // Try to determine what type was expected based on the validation error
  if (error.type === 'field') {
    if (error.msg.includes('empty')) {
      analysis.expectedType = 'non-empty string';
      analysis.issue = 'empty value';
    } else if (error.msg.includes('email')) {
      analysis.expectedType = 'valid email format';
      analysis.issue = 'invalid email format';
    } else if (error.msg.includes('UUID')) {
      analysis.expectedType = 'valid UUID';
      analysis.issue = 'invalid UUID format';
    } else if (error.msg.includes('格式不正確') || error.msg.includes('format')) {
      analysis.expectedType = 'correctly formatted value';
      analysis.issue = 'format error';
    }
  }
  
  // Include data type information
  analysis.receivedType = typeof error.value;
  
  return analysis;
}

/**
 * Sanitizes request body to remove sensitive data
 * 
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
function sanitizeRequestBody(body) {
  if (!body) return {};
  
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // List of fields to redact
  const sensitiveFields = ['password', 'token', 'secret', 'credential', 'apiKey', 'credit_card'];
  
  // Recursive function to sanitize nested objects
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      // Check if the field name contains any sensitive keywords
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively sanitize nested objects
        sanitizeObject(obj[key]);
      }
    });
    
    return obj;
  }
  
  return sanitizeObject(sanitized);
}

/**
 * Sanitizes request headers to remove sensitive data
 * 
 * @param {Object} headers - Request headers
 * @returns {Object} Sanitized headers
 */
function sanitizeHeaders(headers) {
  if (!headers) return {};
  
  // Create a copy to avoid modifying the original
  const sanitized = { ...headers };
  
  // List of headers to redact
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'proxy-authorization',
    'x-csrf-token'
  ];
  
  // Redact sensitive headers
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Validation Schemas
 * 
 * Collection of validation rules for different API endpoints.
 * Each schema is an array of validation middleware functions that will
 * be applied in order, ending with the handleValidation middleware.
 * 
 * The schemas validate various aspects of the request such as:
 * - Required fields
 * - Data formats (dates, emails, UUIDs)
 * - String patterns (time format)
 */
const validationSchemas = {
  /**
   * Couple Information Validation
   * 
   * Validates the couple's information when creating or updating:
   * - Names cannot be empty
   * - Wedding date must be in ISO8601 format
   * - Wedding time must be in HH:MM format
   * - Location and theme must be provided
   */
  coupleInfo: [
    body('groomName').notEmpty().withMessage('新郎姓名不能為空'),
    body('brideName').notEmpty().withMessage('新娘姓名不能為空'),
    body('weddingDate').isISO8601().withMessage('婚禮日期格式不正確'),
    body('weddingTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('婚禮時間格式不正確'),
    body('weddingLocation').notEmpty().withMessage('婚禮地點不能為空'),
    body('weddingTheme').notEmpty().withMessage('婚禮主題不能為空'),
    handleValidation
  ],
  
  /**
   * Guest Information Validation
   * 
   * Validates guest data when creating or updating:
   * - Name and relationship cannot be empty
   * - Email must be in valid format
   * - Must be associated with a valid couple (UUID)
   */
  guestInfo: [
    body('name').notEmpty().withMessage('賓客姓名不能為空'),
    body('relationship').notEmpty().withMessage('與新人關係不能為空'),
    body('email').isEmail().withMessage('電子郵件格式不正確'),
    body('coupleInfoId').isUUID().withMessage('新人ID格式不正確'),
    handleValidation
  ],
  
  /**
   * Invitation Generation Validation
   * 
   * Validates request to generate an invitation:
   * - Guest ID must be a valid UUID
   */
  generateInvitation: [
    body('guestId').isUUID().withMessage('賓客ID格式不正確'),
    handleValidation
  ],
  
  /**
   * Invitation Update Validation
   * 
   * Validates request to update an invitation:
   * - Guest ID must be a valid UUID
   * - Invitation content must not be empty
   */
  updateInvitation: [
    param('guestId').isUUID().withMessage('賓客ID格式不正確'),
    body('invitationContent').notEmpty().withMessage('邀請函內容不能為空'),
    handleValidation
  ],
  
  /**
   * Invitation Sending Validation
   * 
   * Validates request to send invitations:
   * - Couple ID must be a valid UUID
   */
  sendInvitation: [
    body('coupleInfoId').isUUID().withMessage('新人ID格式不正確'),
    handleValidation
  ],
  
  /**
   * Single Invitation Sending Validation
   * 
   * Validates request to send a single invitation:
   * - Guest ID must be a valid UUID
   */
  sendSingleInvitation: [
    param('guestId').isUUID().withMessage('賓客ID格式不正確'),
    handleValidation
  ]
};

module.exports = validationSchemas; 