const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

// 延遲初始化Prisma，確保在首次使用時才創建實例
let _prisma = null;
const getPrisma = () => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
};

const apiLogger = async (req, res, next) => {
  const start = Date.now();
  
  // 保存原始的res.end方法
  const originalEnd = res.end;
  
  // 重寫res.end方法，用於記錄完成時間和狀態碼
  res.end = function(chunk, encoding) {
    // 調用原始方法
    originalEnd.call(this, chunk, encoding);
    
    const responseTime = Date.now() - start;
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const statusCode = res.statusCode;
    
    // 寫入Winston日誌
    logger.info(`${method} ${originalUrl} ${statusCode} ${responseTime}ms`, {
      method,
      url: originalUrl,
      statusCode,
      responseTime,
      ip,
      userAgent
    });
    
    // 只在生產環境中寫入數據庫日誌
    if (process.env.NODE_ENV === 'production') {
      // 寫入數據庫日誌 (異步操作，不影響響應)
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