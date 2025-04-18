const { createLogger, format, transports, Transport } = require('winston');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 確保日誌目錄存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 延遲初始化Prisma，確保在首次使用時才創建實例
let _prisma = null;
const getPrisma = () => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
};

// 自定義Winston格式
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// 創建數據庫傳輸器
class PrismaTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.name = 'prisma';
    this.level = opts.level || 'info';
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // 僅存儲重要日誌到數據庫
      if (['error', 'warn', 'info'].includes(info.level)) {
        // 只有在生產環境中才寫入數據庫
        if (process.env.NODE_ENV === 'production') {
          const prisma = getPrisma();
          await prisma.systemLog.create({
            data: {
              level: info.level,
              message: info.message,
              metadata: JSON.stringify(info.metadata || {}),
            }
          });
        }
      }
    } catch (error) {
      console.error('Error writing log to database:', error);
    }

    callback();
  }
}

// 創建Winston日誌記錄器
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { service: 'wedding-invitation-api' },
  transports: [
    // 寫入所有日誌到控制台
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`)
      )
    }),
    
    // 寫入所有日誌到文件
    new transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    }),
    
    // 寫入重要日誌到數據庫（僅限生產環境）
    ...(process.env.NODE_ENV === 'production' ? [new PrismaTransport({ level: 'info' })] : [])
  ],
  // 異常處理
  exceptionHandlers: [
    new transports.File({ 
      filename: path.join(logDir, 'exceptions.log') 
    })
  ],
  // 不退出進程
  exitOnError: false
});

// 生產環境禁用控制台日誌輸出
if (process.env.NODE_ENV === 'production') {
  logger.transports.forEach((t) => {
    if (t.name === 'console') {
      t.level = 'error';
    }
  });
}

module.exports = logger; 