/**
 * Metrics Middleware Module
 * 
 * 實現應用程式的指標收集和監控，使用 Prometheus 格式收集以下關鍵指標：
 * - HTTP 請求時間
 * - 端點使用頻率
 * - 錯誤率
 * - API 限流計數
 * 
 * 這些指標可以被 Prometheus 伺服器抓取，並透過 Grafana 等工具建立視覺化儀表板
 * 適用於識別系統瓶頸、追蹤效能問題和監控系統健康狀況
 */
const client = require('prom-client');
const logger = require('../config/logger');

// Register default metrics (memory, CPU, event loop, etc.)
client.collectDefaultMetrics({ prefix: 'wedding_api_' });

/**
 * HTTP Request Duration Metric
 * 
 * Measures how long HTTP requests take to complete in seconds
 * Categorized by route path, HTTP method, and status code
 * 
 * Histogram buckets allow percentile calculations to identify:
 * - p50 (median response time)
 * - p95 (95% of requests complete within this time)
 * - p99 (99% of requests complete within this time)
 * 
 * Critical for performance monitoring and SLA adherence
 */
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'wedding_api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets in seconds - from 10ms to 10s
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 3, 5, 10]
});

/**
 * HTTP Request Counter
 * 
 * Counts total number of HTTP requests received
 * Categorized by route path, HTTP method, and status code
 * 
 * Useful for tracking:
 * - Overall API traffic patterns
 * - Most frequently used endpoints
 * - Unusual spikes in request volume
 */
const httpRequestCounter = new client.Counter({
  name: 'wedding_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

/**
 * HTTP Error Counter
 * 
 * Counts HTTP errors (status codes 4xx and 5xx)
 * Categorized by route path, HTTP method, and status code
 * 
 * Critical for monitoring system reliability:
 * - Client errors (4xx) may indicate API misuse or invalid inputs
 * - Server errors (5xx) indicate internal application issues
 * - High error rates trigger alerts for immediate investigation
 */
const httpErrorCounter = new client.Counter({
  name: 'wedding_api_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code', 'error_type']
});

/**
 * API Rate Limit Counter
 * 
 * Counts instances where API rate limits were enforced
 * Helps detect potential abuse or misconfigured clients
 * 
 * Used to:
 * - Adjust rate limits based on actual usage patterns
 * - Identify IPs/clients that frequently hit limits
 * - Support security monitoring for potential API abuse
 */
const apiRateLimitCounter = new client.Counter({
  name: 'wedding_api_rate_limit_total',
  help: 'Total number of rate limited requests',
  labelNames: ['method', 'route', 'ip']
});

/**
 * Metrics Middleware Function
 * 
 * Captures timing and counting metrics for each request
 * Implements end-to-end request duration measurement
 * Records both successful requests and errors
 * 
 * Process flow:
 * 1. Starts timing when request begins
 * 2. Captures route information
 * 3. Intercepts response to record metrics before sending
 * 4. Updates all relevant metrics based on response status
 */
const metricsMiddleware = (req, res, next) => {
  // Skip metrics collection for the metrics endpoint itself to avoid recursive metrics
  if (req.path === '/metrics') {
    return next();
  }

  // Track which route is handling the request - extracting base route pattern
  // Removes route parameters to avoid high cardinality metrics
  const route = req.originalUrl.split('?')[0] || req.path;
  
  // Start timer to measure request duration
  const end = httpRequestDurationMicroseconds.startTimer();
  
  // Store the original end() method
  const originalEnd = res.end;
  
  // Override the response end method to capture metrics
  res.end = function(...args) {
    // Get the status code of the response
    const statusCode = res.statusCode;
    
    // Record request duration with method, route, and status
    end({ method: req.method, route, status_code: statusCode });
    
    // Count requests with labels
    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode
    });
    
    // Check if this is an error response (4xx or 5xx)
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      
      // Increment error counter with relevant labels
      httpErrorCounter.inc({
        method: req.method,
        route,
        status_code: statusCode,
        error_type: errorType
      });
      
      // Log error for further investigation
      logger.warn(`HTTP ${statusCode} error for ${req.method} ${route}`);
    }
    
    // Check if this is a rate limited response
    if (statusCode === 429) {
      // Increment rate limit counter
      apiRateLimitCounter.inc({
        method: req.method,
        route,
        ip: req.ip
      });
      
      // Log rate limiting for security monitoring
      logger.warn(`Rate limit applied for IP: ${req.ip} on ${req.method} ${route}`);
    }
    
    // Call the original end method to complete the response
    return originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Metrics Handler Function
 * 
 * Serves Prometheus-formatted metrics for scraping
 * Collects all registered metrics and returns them
 * 
 * This endpoint is typically accessed by:
 * - Prometheus server on a regular interval (e.g., every 15s)
 * - Monitoring dashboards that need current metrics
 * - Health check systems that verify metrics collection
 */
const metricsHandler = async (req, res) => {
  try {
    // Set Prometheus-specific content type
    res.set('Content-Type', client.register.contentType);
    
    // Get all metrics in Prometheus text format
    const metrics = await client.register.metrics();
    
    // Send metrics response
    res.end(metrics);
    
    logger.debug('Metrics scraped successfully');
  } catch (error) {
    // Log metrics collection errors
    logger.error('Error collecting metrics', { error: error.message });
    
    // Return error response
    res.status(500).end('Error collecting metrics');
  }
};

module.exports = {
  metricsMiddleware,
  metricsHandler,
  httpRequestDurationMicroseconds,
  httpRequestCounter,
  httpErrorCounter,
  apiRateLimitCounter
}; 