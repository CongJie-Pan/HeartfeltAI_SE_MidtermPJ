const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const router = express.Router();
const prisma = new PrismaClient();

// 基本健康檢查
router.get('/health', async (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// 詳細健康檢查
router.get('/health/detailed', async (req, res) => {
  try {
    // 檢查數據庫連接
    await prisma.$queryRaw`SELECT 1`;
    
    // 檢查日誌系統
    logger.info('Health check executed');
    
    // 檢查內存使用情況
    const memoryUsage = process.memoryUsage();
    
    // 檢查進程正常運行時間
    const uptime = process.uptime();
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date(),
      database: { status: 'connected' },
      logger: { status: 'operational' },
      system: {
        memoryUsage: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
        },
        uptime: `${Math.round(uptime / 60 / 60)} hours`
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      timestamp: new Date(),
      error: error.message
    });
  }
});

module.exports = router; 