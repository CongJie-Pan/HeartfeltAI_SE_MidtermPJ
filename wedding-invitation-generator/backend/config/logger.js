/**
 * Logger Configuration Module
 * 
 * This module configures a comprehensive logging system using Winston.
 * It handles logging to console, files, and database (in production).
 * The logger provides different log levels and formats for various environments.
 */
const { createLogger, format, transports, Transport } = require('winston');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Lazy initialization pattern for Prisma client
 * Only creates the Prisma instance when it's first needed
 * This helps optimize resources and prevent connection issues on startup
 * 
 * The use of a private variable (_prisma) with a getter function (getPrisma)
 * ensures that the database connection is only established when needed,
 * which reduces unnecessary resource consumption during application startup
 */
let _prisma = null;
const getPrisma = () => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
};

/**
 * Custom Winston format configuration
 * - Adds timestamps to all logs in YYYY-MM-DD HH:mm:ss format for readability
 * - Includes error stacks when available for detailed debugging
 * - Formats data using JSON for structured logging and better parsability
 * - The splat format allows for string interpolation with multiple parameters
 */
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

/**
 * Custom Winston Transport for Database Logging
 * Extends the base Transport class to provide logging to database
 * Only logs important events (error, warn, info) to the database
 * Only active in production environment to avoid unnecessary database writes
 * 
 * This transport implementation follows the Winston Transport interface
 * and defines a custom log method that writes to the Prisma database
 */
class PrismaTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'prisma';
    this.level = opts.level || 'info'; // Default level is info
  }

  /**
   * Log method implementation for the custom transport
   * Writes log data to the database via Prisma client
   * 
   * @param {Object} info - Log information object
   * @param {Function} callback - Callback function to execute after logging
   */
  async log(info, callback) {
    // Emit 'logged' event asynchronously using setImmediate
    // This ensures the event doesn't block the logging process
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // Only store important logs to database
      if (['error', 'warn', 'info'].includes(info.level)) {
        // Only write to database in production
        if (process.env.NODE_ENV === 'production') {
          const prisma = getPrisma();
          await prisma.systemLog.create({
            data: {
              level: info.level,
              message: info.message,
              metadata: JSON.stringify(info.metadata || {}),
            }
          });
        }
      }
    } catch (error) {
      console.error('Error writing log to database:', error);
    }

    callback(); // Execute callback after logging
  }
}

/**
 * Main Winston logger configuration
 * Sets up multiple transports for comprehensive logging:
 * - Console for development visibility with colorized output
 * - Error log file for critical issues, capturing only error level logs
 * - Combined log file for all log levels to provide complete history
 * - Database logging in production for important events with persistence
 * 
 * The log level varies by environment:
 * - Development: 'debug' level for detailed troubleshooting
 * - Production: 'info' level to reduce noise and focus on important events
 */
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { service: 'wedding-invitation-api' }, // Metadata added to all logs
  transports: [
    // Console logging with colorized output for better readability
    new transports.Console({
      format: format.combine(
        format.colorize(), // Adds colors to log levels for better visibility
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`)
      )
    }),
    
    // Error log file - captures only error level logs
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // Combined log file - captures all log levels
    new transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    }),
    
    // Database logging - only in production and only for important logs
    // Uses spread operator to conditionally add the transport based on environment
    ...(process.env.NODE_ENV === 'production' ? [new PrismaTransport({ level: 'info' })] : [])
  ],
  // Exception handling - captures uncaught exceptions to a dedicated log file
  exceptionHandlers: [
    new transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ],
  // Prevents process exit on uncaught exceptions, allowing graceful handling
  exitOnError: false
});

/**
 * Production environment logging optimization
 * Limits console output to only errors in production
 * This reduces unnecessary console output in production servers
 * while still ensuring critical errors are visible in the console
 */
if (process.env.NODE_ENV === 'production') {
  logger.transports.forEach((t) => {
    if (t.name === 'console') {
      t.level = 'error';
    }
  });
}

module.exports = logger; 