/**
 * API Logger Middleware
 * 
 * This middleware logs detailed information about each API request and response.
 * It tracks request timing, response status codes, and other metadata.
 * In production, it also persists this information to the database for analytics.
 * 
 * Key features:
 * - Logs request method, URL, IP, and user agent
 * - Measures and records response time for performance monitoring
 * - Logs response status code to track errors
 * - In production, writes log entries to the database
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
 * API Logger Middleware Function
 * 
 * Intercepts requests and responses to log API activity.
 * Uses function wrapping to capture response data after completion.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const apiLogger = async (req, res, next) => {
  const start = Date.now();
  
  // Save the original res.end method for later restoration
  const originalEnd = res.end;
  
  // Override res.end to capture response metadata before completion
  res.end = function(chunk, encoding) {
    // Call the original method to ensure normal response flow
    originalEnd.call(this, chunk, encoding);
    
    const responseTime = Date.now() - start;
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const statusCode = res.statusCode;
    
    // Log to Winston logger system
    logger.info(`${method} ${originalUrl} ${statusCode} ${responseTime}ms`, {
      method,
      url: originalUrl,
      statusCode,
      responseTime,
      ip,
      userAgent
    });
    
    // Only log to database in production environment
    if (process.env.NODE_ENV === 'production') {
      // Write to database log (async operation, doesn't block response)
      getPrisma().apiAccessLog.create({
        data: {
          endpoint: originalUrl,
          method,
          statusCode,
          responseTime,
          userIp: ip,
          userAgent
        }
      }).catch(err => {
        logger.error('Failed to log API access to database', { error: err.message });
      });
    }
  };
  
  next();
};

module.exports = apiLogger; 