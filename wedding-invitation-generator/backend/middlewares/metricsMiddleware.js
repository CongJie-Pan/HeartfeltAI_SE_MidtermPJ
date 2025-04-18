/**
 * Metrics Middleware
 * 
 * Implements application metrics collection and monitoring using Prometheus.
 * Tracks key performance indicators like request duration, count, and error rates.
 * 
 * Prometheus is an open-source systems monitoring and alerting toolkit originally
 * built at SoundCloud. It collects and stores time series data with powerful 
 * querying capabilities, making it ideal for monitoring application performance.
 */
const prometheusClient = require('prom-client');

// Enable collection of default metrics (CPU, memory, event loop, etc.)
prometheusClient.collectDefaultMetrics();

/**
 * HTTP Request Duration Histogram
 * 
 * Measures the duration of HTTP requests in milliseconds.
 * Categorized by method, route path, and response status code.
 * Uses histogram buckets to track distribution of request durations.
 */
const httpRequestDurationMicroseconds = new prometheusClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

/**
 * HTTP Request Counter
 * 
 * Counts the total number of HTTP requests received.
 * Categorized by method, route path, and response status code.
 * Useful for tracking traffic patterns and endpoint usage.
 */
const httpRequestCounter = new prometheusClient.Counter({
  name: 'http_requests_total',
  help: 'Counter for total requests received',
  labelNames: ['method', 'route', 'status_code']
});

/**
 * HTTP Error Counter
 * 
 * Counts the total number of HTTP errors (status code >= 400).
 * Categorized by method, route path, and response status code.
 * Helps identify problematic endpoints and client/server errors.
 */
const errorCounter = new prometheusClient.Counter({
  name: 'http_errors_total',
  help: 'Counter for total errors',
  labelNames: ['method', 'route', 'status_code']
});

/**
 * API Rate Limit Counter
 * 
 * Counts how many times rate limits have been hit.
 * Categorized by method, route path, and client IP address.
 * Helps identify potential abuse or needed capacity adjustments.
 */
const apiLimitCounter = new prometheusClient.Counter({
  name: 'api_rate_limit_total',
  help: 'Counter for API rate limit hits',
  labelNames: ['method', 'route', 'ip']
});

/**
 * Metrics Collection Middleware
 * 
 * Captures timing and counting metrics for each request.
 * Uses the response 'finish' event to ensure metrics are captured
 * even for requests that error out or are otherwise interrupted.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Collect metrics when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const { method, originalUrl } = req;
    
    let routePath = originalUrl;
    // Try to get route path instead of specific URL (e.g. /api/users/123 -> /api/users/:id)
    if (req.route && req.route.path) {
      routePath = req.baseUrl + req.route.path;
    }
    
    // Record request duration
    httpRequestDurationMicroseconds
      .labels(method, routePath, statusCode)
      .observe(duration);
      
    // Increment request counter
    httpRequestCounter
      .labels(method, routePath, statusCode)
      .inc();
      
    // If error response, increment error counter
    if (statusCode >= 400) {
      errorCounter
        .labels(method, routePath, statusCode)
        .inc();
    }
  });
  
  next();
};

/**
 * Metrics Endpoint Handler
 * 
 * Serves Prometheus-formatted metrics for scraping.
 * Can be disabled via environment variable for security in certain deployments.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const metricsHandler = async (req, res) => {
  if (!process.env.ENABLE_METRICS) {
    return res.status(404).json({ message: 'Metrics not enabled' });
  }
  
  try {
    res.set('Content-Type', prometheusClient.register.contentType);
    res.end(await prometheusClient.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

module.exports = {
  metricsMiddleware,
  metricsHandler,
  apiLimitCounter
}; 