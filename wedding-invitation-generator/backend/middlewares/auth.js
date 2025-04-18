/**
 * Authentication Middleware
 * 
 * Implements JWT (JSON Web Token) based authentication for API security.
 * Provides functions for token generation, verification, and role-based access control.
 * 
 * JWT is an open standard (RFC 7519) that defines a compact and self-contained way 
 * for securely transmitting information between parties as a JSON object.
 * This information can be verified and trusted because it is digitally signed.
 */
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Verifies that JWT secret is properly configured in environment variables
 * This is critical for security as a missing or weak secret could compromise authentication
 * 
 * @returns {boolean} True if JWT_SECRET is configured, false otherwise
 */
const checkJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not defined in environment variables');
    return false;
  }
  return true;
};

/**
 * Generates a JWT access token for user authentication
 * The token contains the user ID and expires after 1 hour
 * 
 * @param {string} userId - The ID of the user to authenticate
 * @returns {string} Signed JWT token
 * @throws {Error} If JWT_SECRET is not configured
 */
const generateAccessToken = (userId) => {
  if (!checkJwtSecret()) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

/**
 * Authentication Middleware
 * 
 * Verifies the JWT token in the request's Authorization header
 * If valid, adds the decoded user information to the request object
 * If invalid, returns an appropriate error response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if authentication fails
 */
const authenticateToken = (req, res, next) => {
  if (!checkJwtSecret()) {
    return res.status(500).json({ message: '伺服器配置錯誤' });
  }
  
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ message: '請先登入' });
  }
  
  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Authentication failed: Token expired', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        return res.status(401).json({ message: '登入已過期，請重新登入' });
      }
      
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        error: err.message
      });
      return res.status(403).json({ message: '無效的認證' });
    }
    
    // Add user info to request object for use in route handlers
    req.user = user;
    next();
  });
};

/**
 * Admin-Only Middleware
 * 
 * Restricts access to routes only for users with admin role
 * Must be used after the authenticateToken middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} Error response if user is not an admin
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('Admin access denied', {
      userId: req.user ? req.user.userId : null,
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({ message: '需要管理員權限' });
  }
  next();
};

module.exports = {
  generateAccessToken,
  authenticateToken,
  adminOnly
}; 