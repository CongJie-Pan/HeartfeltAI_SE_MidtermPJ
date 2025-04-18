const logger = require('../config/logger');

// 全局錯誤處理中間件
const errorHandler = (err, req, res, next) => {
  // 錯誤堆棧和詳細信息
  logger.error('Unhandled error', { 
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    user: req.user
  });
  
  // 分類錯誤類型
  let statusCode = 500;
  let message = '伺服器內部錯誤';
  
  // Prisma錯誤處理
  if (err.code) {
    switch (err.code) {
      case 'P2002': // 唯一約束衝突
        statusCode = 409;
        message = '資料已存在';
        break;
      case 'P2025': // 記錄不存在
        statusCode = 404;
        message = '找不到請求的資源';
        break;
      case 'P2003': // 外鍵約束錯誤
        statusCode = 400;
        message = '無效的關聯資料';
        break;
    }
  }
  
  // 驗證錯誤
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }
  
  // 授權錯誤
  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '無效的認證';
  }
  
  // 響應客戶端
  res.status(statusCode).json({
    message,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler; 