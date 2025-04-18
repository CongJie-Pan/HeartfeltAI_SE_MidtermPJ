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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if validation fails
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation error', {
      errors: errors.array(),
      body: req.body,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(400).json({
      message: '輸入資料有誤',
      errors: errors.array()
    });
  }
  next();
};

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