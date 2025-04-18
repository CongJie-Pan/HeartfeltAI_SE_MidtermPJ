/**
 * Security Configuration Module
 * 
 * This module implements various security measures for the API:
 * - Helmet for secure HTTP headers
 * - Rate limiting to prevent abuse
 * - Request throttling to minimize DoS impacts
 * - CORS configuration to control cross-origin requests
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const logger = require('./logger');

/**
 * CORS Configuration
 * Restricts which domains can access the API
 * - In production: Only allows the specified frontend URL
 * - In development: Allows localhost development servers
 * Controls allowed methods, headers, and enables credentials
 */
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours - how long browsers should cache CORS responses
};

/**
 * API Rate Limiter
 * Prevents abuse by limiting how many requests an IP can make
 * - Tracks requests within a 15-minute window
 * - Limits each IP to 100 requests in that window
 * - Logs attempts that exceed the rate limit for security monitoring
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler for rate limit violations
  handler: (req, res, next, options) => {
    // Log rate limit violations for security monitoring
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      method: req.method,
      path: req.path,
      headers: req.headers
    });
    
    res.status(options.statusCode).json({
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) // minutes
    });
  }
});

/**
 * Request Speed Limiter
 * Gradually slows down responses based on request frequency
 * - Tracks requests within a 5-minute window
 * - After 10 requests, starts adding progressive delays
 * - Helps prevent DoS attacks while still allowing legitimate heavy usage
 */
const speedLimiter = slowDown({
  windowMs: 5 * 60 * 1000, // 5 minutes tracking window
  delayAfter: 10, // Start delaying after 10 requests
  delayMs: (hits) => hits * 100, // Add 100ms delay per hit above threshold
});

/**
 * Speed Limiter Logging Middleware
 * Monitors and logs when speed limiting is applied
 * Important for security monitoring and diagnosing potential abuse
 */
const logSpeedLimiter = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Check if delay was applied
    if (req.slowDown && req.slowDown.delay) {
      logger.info(`Speed limit applied for IP: ${req.ip}`, {
        ip: req.ip,
        method: req.method,
        path: req.path,
        delay: req.slowDown.delay
      });
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Main security configuration function
 * Applies all security measures to the Express app
 */
const configSecurity = (app) => {
  // Enable Helmet for secure HTTP headers
  app.use(helmet());
  
  // Configure CORS protection
  app.use(cors(corsOptions));
  
  // Apply global API rate limiting
  app.use('/api/', apiLimiter);
  
  // Apply stricter rate limiting to resource-intensive routes
  app.use('/api/invitations/generate', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 20, // Limit to 20 requests per hour
    message: '請求生成邀請函次數過多，請稍後再試'
  }));
  
  // Apply speed limiting to invitation endpoints
  app.use('/api/invitations', logSpeedLimiter);
  app.use('/api/invitations', speedLimiter);
  
  // Disable X-Powered-By header to avoid exposing Express
  app.disable('x-powered-by');
  
  // Log that security configuration has been applied
  logger.info('Security configuration applied');
};

module.exports = configSecurity; 