/**
 * Health and Status Check Routes
 * 
 * This module defines API endpoints for monitoring system health and status.
 * These endpoints are used for:
 * - Uptime monitoring
 * - Health check by load balancers
 * - System diagnostics
 * - Environment verification
 * 
 * These routes are intentionally not authenticated to allow for external monitoring.
 * All routes are prefixed with '/api' from the main application.
 */
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const nodemailer = require('nodemailer');

// Create Express router
const router = express.Router();
const prisma = new PrismaClient();

/**
 * Basic Health Check
 * 
 * GET /api/health
 * 
 * Provides a simple health check endpoint that returns basic status information.
 * This endpoint is designed to be lightweight and fast for frequent polling.
 * 
 * Used by:
 * - Load balancers to determine if instance is healthy
 * - Monitoring systems to track uptime
 * - Kubernetes/Docker health checks
 * 
 * Returns a simple 200 response with timestamp if the server is running.
 */
router.get('/', async (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

/**
 * Detailed Health Check
 * 
 * GET /api/health/detailed
 * 
 * Provides detailed system health information including:
 * - Database connectivity
 * - Logging system status
 * - Memory usage statistics
 * - System uptime
 * 
 * This endpoint performs actual checks against dependencies like the database,
 * making it more thorough but also more resource-intensive than the basic check.
 * 
 * Returns detailed system information when all checks pass,
 * or a 500 error if any component fails its health check.
 */
router.get('/detailed', async (req, res) => {
  try {
    // Database connection check
    await prisma.$queryRaw`SELECT 1`;
    
    // Logging system check
    logger.info('Health check executed');
    
    // Memory usage statistics
    const memoryUsage = process.memoryUsage();
    
    // Process uptime check
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

/**
 * Email Service Health Check
 * 
 * GET /api/health/email
 * 
 * Verifies the email service configuration and connectivity.
 * Tests connection to SMTP server and reports detailed diagnostics.
 */
router.get('/email', async (req, res) => {
  try {
    logger.info('開始診斷郵件服務健康狀況');
    
    // 檢查環境變數是否配置
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER ? '已設置' : '未設置',
      pass: process.env.SMTP_PASS ? '已設置' : '未設置',
      fromEmail: process.env.FROM_EMAIL
    };
    
    const configComplete = smtpConfig.host && smtpConfig.port && 
                          smtpConfig.user === '已設置' && 
                          smtpConfig.pass === '已設置' &&
                          smtpConfig.fromEmail;
    
    // 建立診斷結果物件
    const diagnostics = {
      status: configComplete ? 'pending' : 'error',
      timestamp: new Date().toISOString(),
      configuration: {
        complete: configComplete,
        ...smtpConfig,
        // 不返回實際密碼
        pass: process.env.SMTP_PASS ? '**********' : '未設置' 
      },
      connection: null,
      message: configComplete ? '配置已完成，正在檢查連接...' : '郵件服務配置不完整'
    };
    
    // 如果配置不完整，直接返回
    if (!configComplete) {
      logger.warn('郵件服務配置不完整', { smtpConfig });
      return res.status(200).json(diagnostics);
    }
    
    // 嘗試連接到 SMTP 服務器
    try {
      // 創建臨時郵件傳輸器用於驗證
      const tempTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // 設置超時時間以避免長時間掛起
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000
      });
      
      logger.info('正在驗證SMTP連接');
      const startTime = Date.now();
      const verifyResult = await tempTransporter.verify();
      const responseTime = Date.now() - startTime;
      
      diagnostics.connection = {
        status: 'connected',
        responseTime: responseTime,
        protocol: smtpConfig.secure ? 'SMTPS' : 'SMTP',
        verifyResult: verifyResult
      };
      
      diagnostics.status = 'ok';
      diagnostics.message = '郵件服務配置正確且連接成功';
      
      logger.info('SMTP連接驗證成功', { 
        responseTime, 
        protocol: smtpConfig.secure ? 'SMTPS' : 'SMTP' 
      });
      
    } catch (error) {
      // 連接測試失敗
      diagnostics.connection = {
        status: 'error',
        error: error.message,
        code: error.code,
        command: error.command,
        responseCode: error.responseCode,
        response: error.response
      };
      
      diagnostics.status = 'error';
      diagnostics.message = `郵件服務連接失敗: ${error.message}`;
      
      // 添加針對常見錯誤的診斷建議
      if (error.code === 'ECONNREFUSED') {
        diagnostics.troubleshooting = '連接被拒絕，可能是主機名稱或端口錯誤，或SMTP服務未運行';
      } else if (error.code === 'ETIMEDOUT') {
        diagnostics.troubleshooting = '連接超時，可能是網絡問題、防火牆阻擋或主機不可用';
      } else if (error.code === 'EAUTH') {
        diagnostics.troubleshooting = '認證失敗，請檢查用戶名和密碼';
      } else if (error.code === 'ESOCKET') {
        diagnostics.troubleshooting = 'Socket錯誤，可能是SSL/TLS配置問題';
      }
      
      logger.error('SMTP連接驗證失敗', { 
        error: error.message, 
        code: error.code,
        command: error.command,
        responseCode: error.responseCode
      });
    }
    
    logger.info('完成郵件服務健康檢查', { 
      status: diagnostics.status,
      message: diagnostics.message 
    });
    
    res.status(diagnostics.status === 'ok' ? 200 : 200).json(diagnostics);
  } catch (error) {
    // 整體檢查過程出錯
    logger.error('郵件健康檢查失敗', { error: error.message, stack: error.stack });
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: '檢查過程發生錯誤',
      details: error.message
    });
  }
});

module.exports = router; 