const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const logger = require('./logger');

// CORS配置
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24小時
};

// 速率限制器
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 每個IP限制請求數
  standardHeaders: true,
  legacyHeaders: false,
  // 速率限制被觸發時的處理
  handler: (req, res, next, options) => {
    // 記錄到日誌
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      method: req.method,
      path: req.path,
      headers: req.headers
    });
    
    res.status(options.statusCode).json({
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) // 分鐘
    });
  }
});

// 請求減速器 (對於密集操作如生成邀請函)
const speedLimiter = slowDown({
  windowMs: 5 * 60 * 1000, // 5分鐘
  delayAfter: 10, // 10個請求後開始延遲
  delayMs: (hits) => hits * 100, // 每多一個請求，增加100ms延遲
});

// 記錄減速器觸發的中間件
const logSpeedLimiter = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // 檢查是否添加了延遲
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

// 配置安全中間件
const configSecurity = (app) => {
  // 啟用各種安全頭部
  app.use(helmet());
  
  // 配置CORS
  app.use(cors(corsOptions));
  
  // 全局API速率限制
  app.use('/api/', apiLimiter);
  
  // 對特定重資源路由應用更嚴格的限制
  app.use('/api/invitations/generate', rateLimit({
    windowMs: 60 * 60 * 1000, // 1小時
    max: 20, // 每小時最多20個請求
    message: '請求生成邀請函次數過多，請稍後再試'
  }));
  
  // 延遲敏感API響應以防暴力攻擊
  app.use('/api/invitations', logSpeedLimiter);
  app.use('/api/invitations', speedLimiter);
  
  // 禁用顯示Express信息的頭部
  app.disable('x-powered-by');
  
  // 記錄安全配置已應用
  logger.info('Security configuration applied');
};

module.exports = configSecurity; 