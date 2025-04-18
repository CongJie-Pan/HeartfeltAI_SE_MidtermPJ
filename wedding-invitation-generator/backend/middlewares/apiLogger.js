/**
 * API Request Logging Middleware
 * 
 * This middleware logs detailed information about each API request and response.
 * It captures HTTP method, URL, IP address, response status, response time,
 * and other relevant request metadata for monitoring and debugging purposes.
 * In production, it also logs important requests to the database via the
 * configured Winston logger.
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

/**
 * Lazy initialization for Prisma client
 * Only creates the database connection when first needed
 * This improves startup performance and prevents issues
 * with database availability during server initialization
 */
let _prisma = null;
const getPrisma = () => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
};

/**
 * API Logger middleware function
 * Captures and logs information about incoming requests and outgoing responses
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const apiLogger = (req, res, next) => {
  // Skip logging for non-API routes or static assets to reduce noise
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }

  // Capture start time to calculate request duration
  const start = Date.now();
  
  // Extract relevant request data for logging
  const requestData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    referrer: req.headers.referer || req.headers.referrer || '',
    // Include user ID if authenticated, useful for audit trails
    userId: req.user ? req.user.id : 'unauthenticated'
  };
  
  // Log request details at debug level (only shown in development)
  logger.debug(`API Request: ${req.method} ${req.originalUrl}`, {
    metadata: requestData
  });

  // Use response finish event to log after response is sent
  res.on('finish', () => {
    // Calculate request duration in milliseconds
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Construct the response data for logging
    const responseData = {
      ...requestData,
      statusCode,
      duration: `${duration}ms`
    };
    
    // Determine log level based on status code
    // 4xx/5xx are errors or warnings, successful responses are info/debug
    let logLevel = 'info';
    
    if (statusCode >= 500) {
      logLevel = 'error';
    } else if (statusCode >= 400) {
      logLevel = 'warn';
    } else if (process.env.NODE_ENV !== 'production') {
      // In non-production, downgrade successful responses to debug to reduce clutter
      logLevel = 'debug';
    }

    // Log with appropriate level and details
    logger[logLevel](
      `API Response: ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms`,
      { metadata: responseData }
    );
  });

  next();
};

module.exports = apiLogger; 