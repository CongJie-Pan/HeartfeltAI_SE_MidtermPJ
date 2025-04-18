/**
 * Server Entry Point
 * 
 * This file is responsible for starting the Express server and handling
 * graceful shutdowns and error conditions. It configures:
 * - Server startup on the specified port
 * - Process-level error handling
 * - Graceful shutdown procedures
 * 
 * It's separated from the application configuration (app.js) to maintain
 * a clean separation of concerns between app configuration and server runtime.
 */
const app = require('./app');
const logger = require('./config/logger');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Set server port (use environment variable or default to 5000)
const PORT = process.env.PORT || 5000;

/**
 * Uncaught Exception Handler
 * 
 * Catches any unhandled errors at the process level
 * Logs the error details and then terminates the process
 * This is a last resort safety net for unexpected errors
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1); // Exit with error code
});

/**
 * Unhandled Promise Rejection Handler
 * 
 * Catches any unhandled promise rejections
 * These could cause memory leaks if not properly handled
 * Logs the rejection reason but doesn't terminate the process
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, stack: reason.stack });
});

/**
 * Start the HTTP Server
 * 
 * Starts listening for HTTP requests on the configured port
 * Logs basic server information upon successful startup
 */
const server = app.listen(PORT, () => {
  logger.info(`伺服器運行於 http://localhost:${PORT}`);
  logger.info(`環境: ${process.env.NODE_ENV}`);
});

/**
 * Graceful Shutdown Handler Registration
 * 
 * Registers handlers for system signals that should trigger server shutdown:
 * - SIGTERM: Standard termination signal (e.g., from cloud platforms)
 * - SIGINT: Interrupt signal (e.g., from pressing Ctrl+C)
 */
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Graceful Shutdown Function
 * 
 * Implements a controlled shutdown process:
 * 1. Logs the shutdown initiation
 * 2. Closes the HTTP server (stops accepting new connections)
 * 3. Logs successful shutdown and exits normally
 * 4. Implements a timeout to force exit if shutdown takes too long
 * 
 * This helps ensure in-flight requests are completed before shutdown
 * and resources are properly released.
 */
function gracefulShutdown() {
  logger.info('接收到關閉信號，關閉伺服器...');
  
  server.close(() => {
    logger.info('伺服器已關閉');
    process.exit(0); // Exit with success code
  });
  
  // Force shutdown after 15 seconds if normal shutdown fails
  setTimeout(() => {
    logger.error('無法優雅關閉，強制關閉');
    process.exit(1); // Exit with error code
  }, 15000); // 15 second timeout
} 