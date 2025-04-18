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
 * 
 * Uses express-rate-limit library which:
 * - Maintains an in-memory store of IP addresses and their request counts
 * - Increments the counter with each request until the windowMs expires
 * - Returns 429 Too Many Requests status when limit is exceeded
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers (deprecated)
  // Custom handler for rate limit violations
  handler: (req, res, next, options) => {
    // Log rate limit violations for security monitoring
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      method: req.method,
      path: req.path,
      headers: req.headers
    });
    
    // Return standardized response with retry information
    res.status(options.statusCode).json({
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) // minutes until reset
    });
  }
});

/**
 * Request Speed Limiter
 * Gradually slows down responses based on request frequency
 * - Tracks requests within a 5-minute window
 * - After 10 requests, starts adding progressive delays
 * - Helps prevent DoS attacks while still allowing legitimate heavy usage
 * 
 * Unlike rate limiting which blocks requests, speed limiting:
 * - Allows all requests to complete eventually
 * - Adds incremental delays to responses as request count increases
 * - Discourages automated attacks without impacting legitimate users
 * - Works as a complementary measure to hard rate limits
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
 * 
 * Works by:
 * - Intercepting the response end method
 * - Checking if slowDown applied a delay to this request
 * - Logging the delay information for monitoring
 * - Helps identify patterns of potential abuse that haven't triggered rate limits
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
 * 
 * Implements a tiered approach to security:
 * 1. Global protections (Helmet, CORS)
 * 2. Global API rate limiting for all API routes
 * 3. Stricter limits for resource-intensive routes
 * 4. Progressive slowdown for specific API endpoints
 */
const configSecurity = (app) => {
  // Enable Helmet for secure HTTP headers
  app.use(helmet());
  
  // Configure CORS protection
  app.use(cors(corsOptions));
  
  // Apply global API rate limiting
  app.use('/api/', apiLimiter);
  
  // Apply stricter rate limiting to resource-intensive routes
  // Invitation generation is computationally expensive and may involve external API calls
  app.use('/api/invitations/generate', rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 20, // Limit to 20 requests per hour - stricter than global limit
    message: '請求生成邀請函次數過多，請稍後再試' // Message in Traditional Chinese
  }));
  
  // Apply speed limiting to invitation endpoints
  // These routes handle wedding invitation data which may require more processing
  app.use('/api/invitations', logSpeedLimiter);
  app.use('/api/invitations', speedLimiter);
  
  // Disable X-Powered-By header to avoid exposing Express
  // Reduces information disclosure about the server technology
  app.disable('x-powered-by');
  
  // Log that security configuration has been applied
  logger.info('Security configuration applied');
};

module.exports = configSecurity; 