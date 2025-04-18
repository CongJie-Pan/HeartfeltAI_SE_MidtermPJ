const app = require('./app');
const logger = require('./config/logger');
const dotenv = require('dotenv');

// 確保環境變數載入
dotenv.config();

const PORT = process.env.PORT || 5000;

// 未捕獲的異常處理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Promise拒絕未處理的情況
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, stack: reason.stack });
});

// 啟動伺服器
const server = app.listen(PORT, () => {
  logger.info(`伺服器運行於 http://localhost:${PORT}`);
  logger.info(`環境: ${process.env.NODE_ENV}`);
});

// 優雅關閉
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  logger.info('接收到關閉信號，關閉伺服器...');
  
  server.close(() => {
    logger.info('伺服器已關閉');
    process.exit(0);
  });
  
  // 如果15秒內無法關閉，強制關閉
  setTimeout(() => {
    logger.error('無法優雅關閉，強制關閉');
    process.exit(1);
  }, 15000);
} 