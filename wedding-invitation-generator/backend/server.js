/**
 * Server Entry Point
 * 
 * This file is responsible for starting the Express server and handling
 * graceful shutdowns and error conditions. It implements best practices for:
 * - Robust server startup with proper error handling
 * - Explicit network interface binding
 * - Comprehensive process-level error handling
 * - Graceful shutdown procedures with connection draining
 * - Server health monitoring
 * 
 * It's separated from the application configuration (app.js) to maintain
 * a clean separation of concerns between app configuration and server runtime.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded first
console.log('正在加載環境變數...');
dotenv.config();

// Initialize logger and database after environment is loaded
console.log('正在初始化核心模塊...');
let logger;
try {
  logger = require('./config/logger');
  console.log('日誌模塊已加載');
} catch (err) {
  console.error('無法加載日誌模塊:', err.message);
  process.exit(1);
}

/**
 * Core Modules Definition:
 * - Prisma: Database ORM for data persistence
 * - Express App: Web application framework
 * - HTTP Server: Network server for handling requests
 * - Security: Security middleware and configurations
 * - Routes: API endpoints for application features
 */

// Load app and database modules with error handling
let app, prisma;

// Step 1: Initialize and connect to database
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  logger.info('Prisma數據庫模塊已加載');

  // Verify database connection
  prisma.$connect()
    .then(() => {
      logger.databaseConnection(true, { 
        provider: prisma._engineConfig.activeProvider,
        version: prisma._engineConfig.clientVersion
      });
    })
    .catch(err => {
      logger.databaseConnection(false, {
        error: err.message, 
        stack: err.stack,
        code: err.code,
        clientVersion: prisma._engineConfig.clientVersion
      });
    });
} catch (err) {
  logger.error('Prisma數據庫模塊加載失敗', { 
    error: err.message, 
    stack: err.stack,
    module: '@prisma/client',
    path: require.resolve('@prisma/client')
  });
  process.exit(1);
}

// Step 2: Load Express application
try {
  // Check if routes are correctly defined before loading full app
  try {
    const guestRoutes = require('./routes/guestRoutes');
    const coupleRoutes = require('./routes/coupleRoutes');
    const invitationRoutes = require('./routes/invitationRoutes');
    const emailRoutes = require('./routes/emailRoutes');
    const healthRoutes = require('./routes/healthRoutes');
    
    logger.info('API路由模塊檢查成功');
  } catch (routeErr) {
    logger.error('API路由模塊檢查失敗', { 
      error: routeErr.message, 
      stack: routeErr.stack,
      failedAt: routeErr.stack?.split('\n')[1]?.trim() || '無法確定失敗位置',
      // Additional debugging info for path-to-regexp errors
      details: routeErr.message.includes('path-to-regexp') 
        ? '路由定義中可能有無效的參數格式，檢查所有路由參數是否命名正確' 
        : undefined
    });
    throw routeErr; // Re-throw to be caught by outer try-catch
  }
  
  // Check application dependencies first
  try {
    const requiredDeps = ['express', 'helmet', 'morgan', 'cors', 'dotenv', '@prisma/client'];
    const missingDeps = [];
    
    for (const dep of requiredDeps) {
      try {
        require.resolve(dep);
      } catch (e) {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length > 0) {
      logger.warn('缺少關鍵依賴模塊', { missingDeps });
    }
  } catch (depErr) {
    logger.warn('依賴模塊檢查失敗', { error: depErr.message });
  }
  
  // Try to load the app module
  app = require('./app');
  logger.info('Express應用模塊已加載');
  
  // Validate app structure
  if (!app || typeof app !== 'function') {
    logger.warn('Express應用模塊結構異常', { 
      type: typeof app,
      isFunction: typeof app === 'function',
      hasRouter: app && app._router ? 'yes' : 'no'
    });
  }
} catch (err) {
  // Identify specific modules where the error originated
  const failedModule = err.stack?.split('\n')
    .find(line => line.includes('./') && !line.includes('server.js'))
    ?.trim() || '無法確定';
  
  // Create detailed diagnostics object
  const diagnostics = {
    error: err.message,
    stack: err.stack,
    failedModule,
    moduleResolution: {
      attemptedPath: err.requireStack?.[0] || 'unknown',
      nodePath: process.env.NODE_PATH || '未設置'
    },
    systemInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      cwd: process.cwd()
    },
    dependencies: {}
  };
  
  // Check for specific error types and add targeted suggestions
  let specificSuggestion = '';
  
  if (err.code === 'MODULE_NOT_FOUND') {
    const missingModule = err.message.match(/Cannot find module '([^']+)'/)?.[1] || '';
    diagnostics.moduleNotFound = missingModule;
    specificSuggestion = `缺少模組 '${missingModule}'，請執行 npm install ${missingModule}`;
  } else if (err.message.includes('path-to-regexp')) {
    specificSuggestion = '檢查路由定義中的參數格式，特別是 /api/ 開頭的路由中使用的冒號參數';
  } else if (err.message.includes('app.use')) {
    specificSuggestion = '中間件註冊順序錯誤或中間件函數定義不正確';
  } else if (err.message.includes('Cannot read properties of undefined')) {
    specificSuggestion = '某個物件未正確初始化，檢查中間件和路由處理函數中的變數';
  } else if (err.message.includes('listen')) {
    specificSuggestion = '端口可能被占用或無權訪問，嘗試更改端口或以管理員權限運行';
  }
  
  // Try to get more information about dependencies
  try {
    const fs = require('fs');
    const path = require('path');
    const packageJsonPath = path.join(__dirname, '../package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      diagnostics.dependencies = {
        expressVersion: packageJson.dependencies?.express || '未找到',
        dependenciesList: Object.keys(packageJson.dependencies || {})
      };
    }
  } catch (pkgErr) {
    diagnostics.packageJsonError = pkgErr.message;
  }
  
  // Log comprehensive error information
  logger.error('Express應用模塊加載失敗', diagnostics);
  
  // Provide a user-friendly error message with the specific suggestion
  console.error(`
======================================================
錯誤: Express應用啟動失敗
------------------------------------------------------
錯誤消息: ${err.message}
失敗模組: ${failedModule}

可能原因及解決方案:
${specificSuggestion || '檢查應用程式配置和依賴模塊是否正確安裝'}

請查看日誌文件獲取更多詳細資訊。
======================================================
  `);
  
  process.exit(1);
}

// Set server port and host (use environment variables or defaults)
const PORT = normalizePort(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// Log current configuration
logger.info('伺服器配置', { 
  port: PORT, 
  host: HOST, 
  nodeEnv: process.env.NODE_ENV || 'development',
  pwd: process.cwd(),
  platform: process.platform,
  nodeVersion: process.version
});

/**
 * Uncaught Exception Handler
 * 
 * Catches any unhandled errors at the process level
 * Logs the error details and then terminates the process
 * This is a last resort safety net for unexpected errors
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - Terminating Process', { 
    error: error.message, 
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give logger time to flush before exiting
  setTimeout(() => {
    process.exit(1); // Exit with error code
  }, 1000);
});

/**
 * Unhandled Promise Rejection Handler
 * 
 * Catches any unhandled promise rejections
 * These could cause memory leaks if not properly handled
 * Logs the rejection reason but doesn't terminate the process
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection - System Unstable', { 
    reason: reason?.message || reason, 
    stack: reason?.stack,
    timestamp: new Date().toISOString()
  });
});

/**
 * Create HTTP server
 * Explicitly creates an HTTP server instead of using app.listen()
 * This gives more control over the server instance
 */
logger.info('創建HTTP伺服器...');
const server = http.createServer(app);

/**
 * Handle specific server errors
 * 
 * @param {Error} error - The error that occurred
 * @throws {Error} - Rethrows if error isn't related to server startup
 */
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} 需要管理員權限`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} 已被其他應用程序使用，請嘗試修改 .env 文件中的 PORT 設置或關閉使用此端口的程序`);
      process.exit(1);
      break;
    default:
      logger.error('伺服器啟動錯誤', { error: error.message, code: error.code });
      throw error;
  }
});

/**
 * Server listening event handler
 * 
 * Executed when the server successfully starts listening for connections
 * Logs detailed server information upon successful startup
 */
server.on('listening', () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  
  // Use the specialized serverStart logger method
  logger.serverStart(PORT, HOST);
  
  logger.info(`網址: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  logger.info(`環境: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`按 CTRL+C 關閉伺服器`);
  
  // Check if API routes are registered (simplified approach)
  try {
    if (app._router && app._router.stack) {
      // Count routes based on router layers
      const routerLayers = app._router.stack.filter(layer => layer.name === 'router' || layer.route);
      logger.info(`已註冊路由層: ${routerLayers.length}`);
      
      // Log API endpoints for monitoring
      const apiPaths = ['/api/health', '/api/couple', '/api/guests', '/api/invitations', '/api/emails'];
      logger.info(`API端點: ${apiPaths.join(', ')}`);
      
      // Log each route for better debugging
      const routes = [];
      routerLayers.forEach(layer => {
        if (layer.route) {
          routes.push({
            path: layer.route.path,
            method: Object.keys(layer.route.methods)[0].toUpperCase()
          });
        } else if (layer.name === 'router' && layer.regexp) {
          const baseRoute = layer.regexp.toString().replace('/^', '').replace('\\/?(?=\\/|$)/i', '').replace(/\\\//g, '/');
          routes.push({
            path: baseRoute,
            type: 'router'
          });
        }
      });
      
      logger.info('路由詳細列表', { routes });
    }
  } catch (err) {
    logger.warn('無法解析路由信息', { error: err.message });
  }
  
  // Log performance baselines for future comparison
  logger.info('系統基準性能', {
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    uptime: process.uptime()
  });
});

/**
 * Start the HTTP Server
 * 
 * Explicitly binds to the specified host and port
 * This ensures consistent behavior across different environments
 */
logger.info(`嘗試開始監聽 ${HOST}:${PORT}...`);
server.listen(PORT, HOST);

/**
 * Graceful Shutdown Handler Registration
 * 
 * Registers handlers for system signals that should trigger server shutdown:
 * - SIGTERM: Standard termination signal (e.g., from cloud platforms)
 * - SIGINT: Interrupt signal (e.g., from pressing Ctrl+C)
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Graceful Shutdown Function
 * 
 * Implements a controlled shutdown process:
 * 1. Logs the shutdown initiation
 * 2. Closes the database connections to prevent corruption
 * 3. Closes the HTTP server (stops accepting new connections)
 * 4. Logs successful shutdown and exits normally
 * 5. Implements a timeout to force exit if shutdown takes too long
 * 
 * This helps ensure in-flight requests are completed before shutdown
 * and resources are properly released.
 * 
 * @param {string} signal - The signal that triggered the shutdown
 */
function gracefulShutdown(signal) {
  const shutdownStart = Date.now();
  logger.serverShutdown(signal, 0);
  
  // Track shutdown phases
  let dbClosed = false;
  let serverClosed = false;
  
  // Set timeout for forced exit
  const forceExitTimeout = setTimeout(() => {
    const duration = Date.now() - shutdownStart;
    logger.error(`無法在時限內完成優雅關閉 (DB Closed: ${dbClosed}, Server Closed: ${serverClosed})，強制關閉`, {
      shutdownDuration: duration,
      dbClosed,
      serverClosed
    });
    process.exit(1); // Exit with error code
  }, 15000); // 15 second timeout
  
  // Helper to complete process once all components are closed
  const checkComplete = () => {
    if (dbClosed && serverClosed) {
      const duration = Date.now() - shutdownStart;
      clearTimeout(forceExitTimeout);
      logger.serverShutdown(signal, duration);
      logger.info('所有服務已正確關閉，程序結束', {
        shutdownDuration: duration,
        cleanShutdown: true
      });
      
      // Allow logs to flush before exit
      setTimeout(() => {
        process.exit(0); // Exit with success code
      }, 500);
    }
  };
  
  // Close database connections first
  prisma.$disconnect()
    .then(() => {
      logger.info('資料庫連接已關閉', {
        shutdownPhase: 'database',
        duration: Date.now() - shutdownStart
      });
      dbClosed = true;
      checkComplete();
    })
    .catch(err => {
      logger.error('資料庫關閉過程中發生錯誤', { 
        error: err.message,
        shutdownPhase: 'database',
        duration: Date.now() - shutdownStart
      });
      dbClosed = true; // Mark as done despite error
      checkComplete();
    });
  
  // Close server connections (with delay to let DB close first)
  setTimeout(() => {
    server.close(() => {
      logger.info('伺服器已關閉，不再接受新連接', {
        shutdownPhase: 'http_server',
        duration: Date.now() - shutdownStart
      });
      serverClosed = true;
      checkComplete();
    });
  }, 1000);
}

/**
 * Normalize port value
 *
 * Ensures the port is a positive integer or a named pipe
 * Throws an error for invalid port values
 * 
 * @param {string|number} val - The port value to normalize
 * @returns {string|number} - The normalized port value
 */
function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    return val; // Named pipe
  }

  if (port >= 0) {
    return port; // Port number
  }

  throw new Error(`Invalid port value: ${val}`);
} 