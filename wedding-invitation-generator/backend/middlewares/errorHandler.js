/**
 * Global Error Handler Middleware
 * 
 * Provides centralized error handling for the entire application.
 * This middleware catches unhandled errors from all routes and middleware,
 * logs detailed information about the errors, and returns appropriate
 * responses to the client based on error types.
 * 
 * Key features:
 * - Comprehensive error logging with contextual information
 * - Intelligent error classification and handling
 * - Custom status codes and messages based on error types
 * - Prisma database error handling
 * - Environment-sensitive error details (more details in development)
 */
const logger = require('../config/logger');

/**
 * Global Error Handler Middleware
 * 
 * This middleware should be registered after all routes and other middleware
 * to catch any errors that occur during request processing.
 * 
 * @param {Error} err - The error object from the previous middleware or route
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (not used in this case)
 */
const errorHandler = (err, req, res, next) => {
  // Log error with detailed context information for debugging
  logger.error('Unhandled error', { 
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    user: req.user
  });
  
  // Default error classification
  let statusCode = 500;
  let message = '伺服器內部錯誤';
  
  /**
   * Prisma Database Error Handling
   * 
   * Handles specific Prisma ORM error codes with appropriate status codes:
   * - P2002: Unique constraint violations (duplicate data)
   * - P2025: Record not found errors
   * - P2003: Foreign key constraint errors
   * 
   * For more Prisma error codes, see: 
   * https://www.prisma.io/docs/reference/api-reference/error-reference
   */
  if (err.code) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409;
        message = '資料已存在';
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        message = '找不到請求的資源';
        break;
      case 'P2003': // Foreign key constraint error
        statusCode = 400;
        message = '無效的關聯資料';
        break;
    }
  }
  
  // Validation error handling (usually from express-validator or similar)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }
  
  // Authentication/authorization error handling
  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '無效的認證';
  }
  
  // Send error response to client
  res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler; 