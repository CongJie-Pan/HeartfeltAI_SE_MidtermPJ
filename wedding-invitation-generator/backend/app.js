/**
 * Main Application Configuration
 * 
 * This file configures the Express application, including middleware setup,
 * route registration, security configuration, and error handling.
 * 
 * Key components:
 * - Express middleware configuration for parsing, security, and logging
 * - API routes registration for all application features
 * - Static file serving for the frontend in production
 * - Global error handling and 404 route handling
 */
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');
const apiLogger = require('./middlewares/apiLogger');
const { metricsMiddleware, metricsHandler } = require('./middlewares/metricsMiddleware');
const configSecurity = require('./config/security');
const { authenticateToken, adminOnly } = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');

/**
 * Import route modules
 * Each module handles a specific feature area of the API
 */
const coupleRoutes = require('./routes/coupleRoutes');
const guestRoutes = require('./routes/guestRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const emailRoutes = require('./routes/emailRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

/**
 * Basic Middleware Configuration
 * 
 * - express.json: Parses incoming JSON payloads (limited to 1MB)
 * - express.urlencoded: Parses URL-encoded form data
 */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/**
 * Security Configuration
 * 
 * Applies various security measures:
 * - Helmet for secure HTTP headers
 * - CORS configuration
 * - Rate limiting
 * - Request throttling
 */
configSecurity(app);

/**
 * Monitoring and Logging Middleware
 * 
 * - metricsMiddleware: Collects Prometheus metrics for monitoring
 * - apiLogger: Logs detailed API request information
 * - morgan: HTTP request logging in combined format
 */
app.use(metricsMiddleware);
app.use(apiLogger);

// HTTP request logging (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

/**
 * Health Check Routes
 * 
 * These routes are registered before authentication to allow for
 * system monitoring and health checks without authentication
 */
app.use('/api', healthRoutes);

/**
 * Root Path Handler
 * 
 * Provides basic API information at the root endpoint
 */
app.get('/', (req, res) => {
  res.status(200).json({
    name: '婚禮邀請函生成系統 API',
    version: '1.0.0',
    description: '提供婚禮邀請函生成和管理功能的API服務',
    docs: '/api/health',
    status: 'running'
  });
});

/**
 * API Routes Registration
 * 
 * These routes handle all the core functionality of the application:
 * - Couple information management
 * - Guest management
 * - Invitation generation and management
 * - Email delivery
 */
app.use('/api/couple', coupleRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/emails', emailRoutes);

/**
 * Metrics Endpoint (Protected)
 * 
 * Provides Prometheus-compatible metrics for monitoring
 * Requires authentication and admin privileges for security
 */
app.get('/api/metrics', authenticateToken, adminOnly, metricsHandler);

/**
 * Frontend Static Files (Production Only)
 * 
 * In production, serves the built frontend React app
 * Also handles client-side routing by serving index.html for all unmatched routes
 */
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

/**
 * Global Error Handler
 * 
 * Catches any errors thrown during request processing
 * Logs errors and returns appropriate responses
 */
app.use(errorHandler);

/**
 * 404 Handler
 * 
 * Handles requests to non-existent routes
 * Must be registered after all other routes
 */
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`, { ip: req.ip });
  res.status(404).json({ message: '找不到請求的資源' });
});

module.exports = app; 