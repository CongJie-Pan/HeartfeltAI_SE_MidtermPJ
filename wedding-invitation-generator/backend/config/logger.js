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
require('winston-daily-rotate-file');
const os = require('os');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create a static log file path for direct access
const staticServerLogPath = path.join(logDir, 'server.log');
// Create a readme file to help users find logs
const readmePath = path.join(logDir, 'README.md');
if (!fs.existsSync(readmePath)) {
  fs.writeFileSync(readmePath, 
`# 日誌文件說明

本目錄包含系統的所有日誌文件：

- **server.log**: 伺服器運行日誌（固定檔案，方便直接查看）
- **server-YYYY-MM-DD.log**: 伺服器日誌（按日期輪換）
- **error-YYYY-MM-DD.log**: 錯誤日誌
- **exceptions-YYYY-MM-DD.log**: 未捕獲異常日誌
- **combined.log**: 所有日誌的綜合記錄

可以使用以下指令查看最新日誌：
\`\`\`
tail -f logs/server.log
\`\`\`
`);
}

/**
 * Server Information
 * Captures static server details for context in logs
 * This helps with debugging issues across different environments
 */
const serverInfo = {
  hostname: os.hostname(),
  platform: os.platform(),
  release: os.release(),
  osType: os.type(),
  arch: os.arch(),
  cpus: os.cpus().length,
  memoryTotal: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
  nodeVersion: process.version,
  pid: process.pid
};

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
 * Server event filter
 * Identifies logs that should be written to the server log file
 * This includes events related to server startup, shutdown, and critical operations
 */
const serverEventFilter = format((info, opts) => {
  // Check if this is a server-related event
  if (
    info.message?.includes('伺服器') || 
    info.message?.includes('server') ||
    info.message?.includes('Server') ||
    info.message?.includes('啟動') ||
    info.message?.includes('關閉') ||
    info.message?.includes('連接') ||
    info.message?.includes('監聽') ||
    info.message?.includes('路由') ||
    info.message?.includes('API') ||
    info.event?.includes('server_') ||
    info.shutdownPhase ||
    info.serverContext ||
    info.startupTime ||
    info.memoryUsage
  ) {
    info.isServerEvent = true;
  }
  return info;
});

/**
 * Custom server context format
 * Adds server identification and context to all logs
 * - Server hostname and process ID for distributed system debugging
 * - Includes full server context for error logs
 * - Adds correlation IDs when available to track request flow
 */
const serverContextFormat = format((info, opts) => {
  info.server = info.server || serverInfo.hostname;
  info.pid = info.pid || serverInfo.pid;
  
  // Add full server context for error and warn logs
  if (['error', 'warn'].includes(info.level)) {
    info.serverContext = serverInfo;
  }
  
  // Add memory usage for performance-related logs
  if (info.message && (
      info.message.includes('memory') || 
      info.message.includes('performance') || 
      info.message.includes('slow')
    )) {
    info.memoryUsage = process.memoryUsage();
  }
  
  return info;
});

/**
 * Custom Winston format configuration
 * - Adds timestamps to all logs in YYYY-MM-DD HH:mm:ss format for readability
 * - Includes error stacks when available for detailed debugging
 * - Formats data using JSON for structured logging and better parsability
 * - The splat format allows for string interpolation with multiple parameters
 * - Adds server context to all logs for better debugging in distributed environments
 */
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  serverContextFormat(),
  serverEventFilter(),
  format.json()
);

/**
 * Console format with improved readability
 * Specially formatted for human readability in development
 * - Uses colors for different log levels
 * - Structured output with timestamp, level, and server context
 * - Full error stacks when available
 */
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(info => {
    const base = `${info.timestamp} [${info.server}:${info.pid}] ${info.level}: ${info.message}`;
    const stack = info.stack ? `\n${info.stack}` : '';
    const context = info.context ? `\n[Context: ${JSON.stringify(info.context)}]` : '';
    return `${base}${context}${stack}`;
  })
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
              server: info.server,
              correlationId: info.correlationId || null
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
 * Server-specific file transport
 * Just for direct debugging without date rotation
 * - Creates a static server.log file that's always at the same path
 * - Makes it easy to use tail -f for monitoring
 */
const staticServerLogTransport = new transports.File({
  filename: staticServerLogPath,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Only log server events to this transport
    format((info) => info.isServerEvent ? info : false)(),
    format.printf(info => {
      return `${info.timestamp} [${info.server || 'server'}:${info.pid || 'main'}] ${info.level}: ${info.message}`;
    })
  )
});

/**
 * Configure file rotation for logs
 * Prevents log files from growing indefinitely and organizes them by date
 * - Daily rotation with compressed archives
 * - Retention policy to automatically delete old logs
 * - Size limit to prevent excessive disk usage
 */
const fileRotateTransport = new transports.DailyRotateFile({
  filename: path.join(logDir, 'server-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  format: customFormat
});

// Configure a server-specific rotating transport with a filter
const serverRotateTransport = new transports.DailyRotateFile({
  filename: path.join(logDir, 'server-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  format: format.combine(
    customFormat,
    // Only log server events to this transport
    format((info) => info.isServerEvent ? info : false)()
  )
});

// Listen for rotation events
fileRotateTransport.on('rotate', (oldFilename, newFilename) => {
  console.log(`Log rotated from ${oldFilename} to ${newFilename}`);
});

/**
 * Main Winston logger configuration
 * Sets up multiple transports for comprehensive logging:
 * - Console for development visibility with colorized output
 * - Error log file for critical issues, capturing only error level logs
 * - Rotating combined log file for all log levels with automatic archiving
 * - Server-specific log file for server lifecycle and performance events
 * - Database logging in production for important events with persistence
 * 
 * The log level varies by environment:
 * - Development: 'debug' level for detailed troubleshooting
 * - Production: 'info' level to reduce noise and focus on important events
 */
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { 
    service: 'wedding-invitation-api',
    server: serverInfo.hostname,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console logging with colorized output for better readability
    new transports.Console({
      format: consoleFormat
    }),
    
    // Static server log file for easy debugging with tail -f
    staticServerLogTransport,
    
    // Error log file with daily rotation - captures only error level logs
    new transports.DailyRotateFile({ 
      filename: path.join(logDir, 'error-%DATE%.log'), 
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    
    // Server-specific log with daily rotation for server lifecycle events
    serverRotateTransport,
    
    // Combined log file with rotation - captures all log levels
    fileRotateTransport,
    
    // Database logging - only in production and only for important logs
    // Uses spread operator to conditionally add the transport based on environment
    ...(process.env.NODE_ENV === 'production' ? [new PrismaTransport({ level: 'info' })] : [])
  ],
  // Exception handling - captures uncaught exceptions to a dedicated log file
  exceptionHandlers: [
    new transports.DailyRotateFile({ 
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    new transports.Console({
      format: consoleFormat
    }),
    // Also log exceptions to the static server log
    staticServerLogTransport
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

/**
 * Server-specific logging methods
 * Specialized methods for common server lifecycle and debugging events
 * These make it easier to add consistent context to important server events
 */
logger.serverStart = (port, host) => {
  logger.info(`伺服器已成功啟動於 ${host}:${port}`, {
    event: 'server_start',
    port,
    host,
    serverInfo,
    startupTime: process.uptime()
  });
};

logger.serverShutdown = (signal, duration) => {
  logger.info(`伺服器正在關閉 (信號: ${signal})`, {
    event: 'server_shutdown',
    signal,
    shutdownDuration: duration,
    uptime: process.uptime()
  });
};

logger.databaseConnection = (success, details) => {
  if (success) {
    logger.info('資料庫連接成功', {
      event: 'database_connected',
      details
    });
  } else {
    logger.error('資料庫連接失敗', {
      event: 'database_connection_failed',
      details
    });
  }
};

logger.performanceWarning = (operation, duration, threshold) => {
  logger.warn(`檢測到緩慢操作: ${operation}`, {
    event: 'slow_operation',
    operation,
    duration,
    threshold,
    memoryUsage: process.memoryUsage()
  });
};

// Log on startup that the logger is configured
logger.info('日誌系統已初始化', { 
  logDir,
  environment: process.env.NODE_ENV || 'development',
  serverInfo
});

// Create a welcome message in the static server log
fs.writeFileSync(staticServerLogPath, 
`==================================================
伺服器日誌文件 (Server Log File)
==================================================
系統啟動時間: ${new Date().toISOString()}
主機名稱: ${serverInfo.hostname}
環境: ${process.env.NODE_ENV || 'development'}
Node版本: ${serverInfo.nodeVersion}
作業系統: ${serverInfo.platform} ${serverInfo.release}
CPU數: ${serverInfo.cpus}
記憶體: ${serverInfo.memoryTotal}
==================================================
\n`);

module.exports = logger; 