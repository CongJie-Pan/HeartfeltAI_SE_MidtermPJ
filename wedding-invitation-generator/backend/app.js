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

// 路由引入
const coupleRoutes = require('./routes/coupleRoutes');
const guestRoutes = require('./routes/guestRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const emailRoutes = require('./routes/emailRoutes');
const healthRoutes = require('./routes/healthRoutes');

// 環境變數設置
dotenv.config();

const app = express();

// 基本中間件
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 安全設定
configSecurity(app);

// 監控中間件
app.use(metricsMiddleware);
app.use(apiLogger);

// HTTP請求記錄
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// 健康檢查路由（需在驗證前）
app.use('/api', healthRoutes);

// 根路徑處理
app.get('/', (req, res) => {
  res.status(200).json({
    name: '婚禮邀請函生成系統 API',
    version: '1.0.0',
    description: '提供婚禮邀請函生成和管理功能的API服務',
    docs: '/api/health',
    status: 'running'
  });
});

// 公開API路由
app.use('/api/couple', coupleRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/emails', emailRoutes);

// 監控指標端點（受保護）
app.get('/api/metrics', authenticateToken, adminOnly, metricsHandler);

// 前端靜態文件服務 (生產環境)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// 全局錯誤處理中間件
app.use(errorHandler);

// 未找到路由處理
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`, { ip: req.ip });
  res.status(404).json({ message: '找不到請求的資源' });
});

module.exports = app; 