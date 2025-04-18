const prometheusClient = require('prom-client');

// 啟用默認指標收集
prometheusClient.collectDefaultMetrics();

// 創建自定義計數器和直方圖
const httpRequestDurationMicroseconds = new prometheusClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

const httpRequestCounter = new prometheusClient.Counter({
  name: 'http_requests_total',
  help: 'Counter for total requests received',
  labelNames: ['method', 'route', 'status_code']
});

const errorCounter = new prometheusClient.Counter({
  name: 'http_errors_total',
  help: 'Counter for total errors',
  labelNames: ['method', 'route', 'status_code']
});

const apiLimitCounter = new prometheusClient.Counter({
  name: 'api_rate_limit_total',
  help: 'Counter for API rate limit hits',
  labelNames: ['method', 'route', 'ip']
});

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // 當響應完成時收集指標
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const { method, originalUrl } = req;
    
    let routePath = originalUrl;
    // 嘗試獲取路由路徑而不是具體URL (例如: /api/users/123 轉為 /api/users/:id)
    if (req.route && req.route.path) {
      routePath = req.baseUrl + req.route.path;
    }
    
    // 記錄請求持續時間
    httpRequestDurationMicroseconds
      .labels(method, routePath, statusCode)
      .observe(duration);
      
    // 增加請求計數
    httpRequestCounter
      .labels(method, routePath, statusCode)
      .inc();
      
    // 如果是錯誤響應，增加錯誤計數
    if (statusCode >= 400) {
      errorCounter
        .labels(method, routePath, statusCode)
        .inc();
    }
  });
  
  next();
};

// 指標端點處理器
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