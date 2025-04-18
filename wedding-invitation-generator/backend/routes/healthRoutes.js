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
router.get('/health', async (req, res) => {
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
router.get('/health/detailed', async (req, res) => {
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

module.exports = router; 