const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// 確保JWT密鑰存在
const checkJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET is not defined in environment variables');
    return false;
  }
  return true;
};

// 創建訪問令牌
const generateAccessToken = (userId) => {
  if (!checkJwtSecret()) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
};

// 驗證中間件
const authenticateToken = (req, res, next) => {
  if (!checkJwtSecret()) {
    return res.status(500).json({ message: '伺服器配置錯誤' });
  }
  
  // 獲取授權頭部
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ message: '請先登入' });
  }
  
  // 驗證令牌
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.warn('Authentication failed: Token expired', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        return res.status(401).json({ message: '登入已過期，請重新登入' });
      }
      
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        error: err.message
      });
      return res.status(403).json({ message: '無效的認證' });
    }
    
    // 將用戶信息添加到請求對象
    req.user = user;
    next();
  });
};

// 只允許管理員訪問
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('Admin access denied', {
      userId: req.user ? req.user.userId : null,
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({ message: '需要管理員權限' });
  }
  next();
};

module.exports = {
  generateAccessToken,
  authenticateToken,
  adminOnly
}; 