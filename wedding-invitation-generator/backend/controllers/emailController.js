/**
 * Email Controller Module
 * 
 * Handles sending wedding invitations via email:
 * - Setting up email transport
 * - Creating HTML email templates
 * - Sending bulk invitations to all guests
 * - Sending individual invitations
 * - Implementing test mode functionality
 * 
 * Uses Nodemailer for email delivery and implements
 * proper error handling and logging.
 */
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

const prisma = new PrismaClient();

/**
 * Verify SMTP Configuration
 * 
 * Tests if the SMTP settings are valid and logs the results
 * Helps diagnose email delivery issues
 * 
 * @returns {boolean} True if configuration is valid, false otherwise
 */
async function verifySmtpConfig() {
  try {
    logger.info('開始驗證 SMTP 設置...');
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.error('SMTP 設置不完整', {
        smtpHost: process.env.SMTP_HOST || '未設置',
        smtpPort: process.env.SMTP_PORT || '未設置',
        smtpUser: process.env.SMTP_USER ? '已設置' : '未設置',
        smtpPass: process.env.SMTP_PASS ? '已設置' : '未設置',
        fromEmail: process.env.FROM_EMAIL || '未設置'
      });
      return false;
    }
    
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
    
    // 嘗試驗證連接
    logger.info('嘗試驗證 SMTP 連接...');
    const verifyResult = await tempTransporter.verify();
    
    logger.info('SMTP 連接驗證成功', {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465
    });
    
    return true;
  } catch (error) {
    logger.error('SMTP 連接驗證失敗', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });
    
    // 提供常見 SMTP 錯誤的具體解決方案
    let troubleshooting = '';
    if (error.code === 'ECONNREFUSED') {
      troubleshooting = 'SMTP 伺服器連接被拒絕，請檢查主機名稱和端口是否正確';
    } else if (error.code === 'ETIMEDOUT') {
      troubleshooting = 'SMTP 伺服器連接超時，請檢查網絡設置或防火牆配置';
    } else if (error.code === 'EAUTH') {
      troubleshooting = '認證失敗，請檢查用戶名和密碼是否正確';
    } else if (error.code === 'ESOCKET') {
      troubleshooting = 'Socket 錯誤，可能是 SSL/TLS 配置問題';
    }
    
    if (troubleshooting) {
      logger.error(`SMTP 故障排除建議: ${troubleshooting}`);
    }
    
    return false;
  }
}

/**
 * Email Transport Configuration
 * Creates and configures Nodemailer transport
 * Handles both secure (465) and non-secure SMTP connections
 * Falls back gracefully if SMTP settings are missing
 */
let transporter;
try {
  // Validate email configuration exists
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: parseInt(process.env.SMTP_PORT, 10) === 465, // Use secure connection if port is 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // 設置超時避免長時間掛起
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
    
    logger.info('電子郵件傳輸器已初始化', {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465,
      timeout: '10000ms'
    });
    
    // 進行初始連接測試
    verifySmtpConfig().then(isValid => {
      if (isValid) {
        logger.info('SMTP 設置有效，電子郵件功能就緒');
      } else {
        logger.warn('SMTP 設置無效，電子郵件功能將不可用');
      }
    });
  } else {
    logger.warn('SMTP 設置不完整', {
      smtpHost: process.env.SMTP_HOST || '未設置',
      smtpPort: process.env.SMTP_PORT || '未設置',
      smtpUser: process.env.SMTP_USER ? '已設置' : '未設置',
      smtpPass: process.env.SMTP_PASS ? '已設置' : '未設置',
      fromEmail: process.env.FROM_EMAIL || '未設置'
    });
  }
} catch (error) {
  logger.error('電子郵件傳輸器初始化失敗', { 
    error: error.message,
    stack: error.stack,
    code: error.code
  });
}

/**
 * Create Email Template
 * 
 * Generates HTML email content with wedding invitation
 * Applies consistent styling and formatting
 * 
 * @param {Object} couple - Couple information (names, date, venue)
 * @param {Object} guest - Guest information
 * @param {string} invitationContent - The personalized invitation text
 * @returns {string} Formatted HTML for email body
 */
const createEmailTemplate = (couple, guest, invitationContent) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      color: #333;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #8b5a2b;
      font-size: 24px;
      margin-bottom: 10px;
    }
    .content {
      background-color: #f9f7f2;
      padding: 30px;
      border-radius: 5px;
      margin-bottom: 20px;
      white-space: pre-line;
    }
    .footer {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin-top: 20px;
    }
    .couple-names {
      font-weight: bold;
      font-style: italic;
      color: #8b5a2b;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>婚禮邀請函</h1>
    <p class="couple-names">${couple.groomName} & ${couple.brideName}</p>
  </div>
  <div class="content">
    ${invitationContent.replace(/\n/g, '<br>')}
  </div>
  <div class="footer">
    <p>婚禮日期: ${couple.weddingDate.toISOString().split('T')[0]} ${couple.weddingTime}</p>
    <p>婚禮地點: ${couple.weddingLocation}</p>
  </div>
</body>
</html>
  `;
};

/**
 * Send Bulk Invitations
 * 
 * Sends wedding invitations to multiple guests in batch
 * Supports test mode to simulate sending without actual delivery
 * Tracks success and failure for each recipient
 * 
 * @route POST /api/emails/send-invitations
 * @param {string} req.body.coupleInfoId - ID of the couple sending invitations
 * @param {boolean} [req.query.testMode] - If true, only simulates sending
 * @returns {Object} Summary of send operation with success/failure counts
 */
exports.sendInvitation = async (req, res) => {
  try {
    const { coupleInfoId } = req.body;
    const { testMode } = req.query;
    
    logger.info('開始處理批量發送邀請函請求', {
      coupleInfoId,
      testMode: testMode === 'true',
      startTime: new Date().toISOString()
    });
    
    // 在正式發送前執行 SMTP 檢查
    if (testMode !== 'true') {
      const isSmtpValid = await verifySmtpConfig();
      if (!isSmtpValid) {
        logger.error('批量發送前SMTP驗證失敗');
        return res.status(500).json({
          message: '郵件服務配置無效，無法發送邀請函。請聯繫管理員檢查SMTP設置。'
        });
      }
    }
    
    // Verify email transport is available
    if (!transporter && testMode !== 'true') {
      logger.error('批量發送失敗: 電子郵件傳輸器不可用', {
        smtpSettings: {
          host: process.env.SMTP_HOST || '未設置',
          port: process.env.SMTP_PORT || '未設置',
          user: process.env.SMTP_USER ? '已設置' : '未設置',
          pass: process.env.SMTP_PASS ? '已設置' : '未設置',
          fromEmail: process.env.FROM_EMAIL || '未設置'
        }
      });
      return res.status(500).json({ 
        message: '郵件服務未正確配置，無法發送邀請函' 
      });
    }
    
    // Get couple information
    logger.debug('正在查詢新人資訊', { coupleInfoId });
    const couple = await prisma.coupleInfo.findUnique({
      where: { id: coupleInfoId }
    });
    
    if (!couple) {
      logger.warn('批量發送失敗: 找不到新人資料', { coupleInfoId });
      return res.status(404).json({ message: '找不到新人資料' });
    }
    
    // Get all guests with generated invitations ready to send
    logger.debug('查詢已準備好的賓客邀請函', { coupleInfoId });
    const guests = await prisma.guest.findMany({
      where: { 
        coupleInfoId,
        invitationContent: { not: null },
        status: { in: ['generated', 'edited'] }
      }
    });
    
    logger.info('已查詢到待發送的賓客清單', {
      coupleInfoId,
      guestCount: guests.length
    });
    
    if (guests.length === 0) {
      logger.warn('批量發送失敗: 沒有可發送的邀請函', { coupleInfoId });
      return res.status(400).json({ 
        message: '沒有可發送的邀請函，請先為賓客生成邀請函' 
      });
    }
    
    logger.info('開始批量發送邀請函', { 
      coupleInfoId, 
      guestCount: guests.length,
      testMode: testMode === 'true'
    });
    
    // Track sending results
    const results = {
      success: [],
      failed: []
    };
    
    // Send invitation to each guest
    for (const guest of guests) {
      try {
        logger.debug(`準備發送給賓客 ${guest.name}`, {
          guestId: guest.id,
          email: guest.email
        });
        
        const emailHtml = createEmailTemplate(couple, guest, guest.invitationContent);
        
        // If test mode, don't actually send emails
        if (testMode === 'true') {
          logger.info('測試模式: 模擬發送郵件', { 
            guestId: guest.id, 
            email: guest.email 
          });
          
          results.success.push({
            guestId: guest.id,
            name: guest.name,
            email: guest.email
          });
          
          continue;
        }
        
        // Send the email
        logger.debug('嘗試發送郵件', {
          guestId: guest.id,
          email: guest.email,
          subject: `婚禮邀請 - ${couple.groomName} & ${couple.brideName}`
        });
        
        const info = await transporter.sendMail({
          from: `"${couple.groomName} & ${couple.brideName}" <${process.env.FROM_EMAIL}>`,
          to: guest.email,
          subject: `婚禮邀請 - ${couple.groomName} & ${couple.brideName}`,
          html: emailHtml
        });
        
        // Update guest status
        await prisma.guest.update({
          where: { id: guest.id },
          data: { status: 'sent' }
        });
        
        logger.info('郵件發送成功', { 
          guestId: guest.id, 
          email: guest.email,
          messageId: info.messageId,
          response: info.response
        });
        
        results.success.push({
          guestId: guest.id,
          name: guest.name,
          email: guest.email
        });
      } catch (error) {
        logger.error('發送郵件失敗', { 
          error: error.message, 
          code: error.code,
          command: error.command,
          responseCode: error.responseCode,
          response: error.response,
          guestId: guest.id, 
          email: guest.email 
        });
        
        results.failed.push({
          guestId: guest.id,
          name: guest.name,
          email: guest.email,
          error: error.message,
          errorCode: error.code || 'UNKNOWN'
        });
      }
    }
    
    // 記錄批量發送結果
    logger.info('批量發送郵件完成', {
      coupleInfoId,
      successCount: results.success.length,
      failedCount: results.failed.length,
      completionTime: new Date().toISOString()
    });
    
    if (results.failed.length > 0) {
      logger.warn('部分邀請函發送失敗', {
        failedCount: results.failed.length,
        totalCount: guests.length,
        failedEmails: results.failed.map(f => ({ email: f.email, error: f.errorCode }))
      });
    }
    
    // Return results summary
    res.status(200).json({
      message: `邀請函發送完成：${results.success.length}成功，${results.failed.length}失敗`,
      results
    });
  } catch (error) {
    logger.error('批量發送邀請函處理過程中出錯', { 
      error: error.message,
      stack: error.stack,
      code: error.code,
      coupleInfoId: req.body.coupleInfoId
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤，無法完成批量發送', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Send Single Invitation
 * 
 * Sends a wedding invitation to a single guest
 * Useful for testing or sending individual reminders
 * Supports test mode to simulate sending
 * 
 * @route POST /api/emails/send-invitation/:guestId
 * @param {string} req.params.guestId - ID of the guest to send invitation to
 * @param {boolean} [req.query.testMode] - If true, only simulates sending
 * @returns {Object} Result of the send operation
 */
exports.sendSingleInvitation = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { testMode } = req.query;
    
    logger.info('開始處理發送單個邀請函請求', { 
      guestId, 
      testMode: testMode === 'true',
      requestTime: new Date().toISOString(),
      smtpConfigured: !!transporter
    });
    
    // Verify email transport is available
    if (!transporter && testMode !== 'true') {
      // 記錄SMTP設置以協助診斷
      logger.error('郵件傳輸器未配置', { 
        smtpHost: process.env.SMTP_HOST || '未設置',
        smtpPort: process.env.SMTP_PORT || '未設置',
        smtpUser: process.env.SMTP_USER ? '已設置' : '未設置',
        smtpPass: process.env.SMTP_PASS ? '已設置' : '未設置',
        fromEmail: process.env.FROM_EMAIL || '未設置'
      });
      return res.status(500).json({ 
        message: '郵件服務未正確配置，無法發送邀請函' 
      });
    }
    
    // Get guest information
    logger.debug('正在查詢賓客資訊', { guestId });
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { coupleInfo: true }
    });
    
    if (!guest) {
      logger.warn('發送邀請函失敗: 找不到賓客', { guestId });
      return res.status(404).json({ message: '找不到賓客資料' });
    }
    
    logger.debug('已獲取賓客資訊', { 
      guestId, 
      guestName: guest.name,
      coupleInfoId: guest.coupleInfoId
    });
    
    if (!guest.invitationContent) {
      logger.warn('發送邀請函失敗: 賓客沒有邀請函內容', { guestId });
      return res.status(400).json({ message: '此賓客尚未生成邀請函' });
    }
    
    logger.info('開始發送單個邀請函', { 
      guestId, 
      email: guest.email,
      testMode: testMode === 'true'
    });
    
    // 記錄生成的電子郵件模板（不含敏感信息）
    logger.debug('生成電子郵件模板', {
      guestId,
      templateLength: guest.invitationContent.length,
      hasContent: !!guest.invitationContent
    });
    
    const emailHtml = createEmailTemplate(guest.coupleInfo, guest, guest.invitationContent);
    
    // If test mode, don't actually send email
    if (testMode === 'true') {
      logger.info('測試模式: 模擬郵件發送', { 
        guestId, 
        email: guest.email 
      });
      
      res.status(200).json({
        message: '測試模式：郵件模擬發送成功',
        guest: {
          id: guest.id,
          name: guest.name,
          email: guest.email
        }
      });
      
      return;
    }
    
    // Log SMTP connection attempt
    logger.debug('嘗試建立SMTP連接', {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465
    });
    
    // Prepare email data
    const mailOptions = {
      from: `"${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName}" <${process.env.FROM_EMAIL}>`,
      to: guest.email,
      subject: `婚禮邀請 - ${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName}`,
      html: emailHtml
    };
    
    // Log email data (without sensitive content)
    logger.debug('準備發送郵件', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      contentLength: mailOptions.html.length
    });
    
    try {
      // Send the email
      const info = await transporter.sendMail(mailOptions);
      
      // Log successful delivery with detailed response
      logger.info('郵件發送成功', {
        guestId,
        email: guest.email,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });
      
      // Update guest status
      logger.debug('更新賓客狀態為已發送', { guestId });
      await prisma.guest.update({
        where: { id: guestId },
        data: { status: 'sent' }
      });
      
      res.status(200).json({
        message: '邀請函發送成功',
        guest: {
          id: guest.id,
          name: guest.name,
          email: guest.email
        }
      });
    } catch (mailError) {
      // 捕捉並記錄郵件發送過程中的詳細錯誤
      logger.error('郵件發送過程中出錯', {
        error: mailError.message,
        stack: mailError.stack,
        code: mailError.code,
        command: mailError.command,
        responseCode: mailError.responseCode,
        response: mailError.response,
        guestId,
        email: guest.email
      });
      
      // 回傳較詳細的錯誤訊息
      return res.status(500).json({
        message: `邀請函發送失敗: ${mailError.code || mailError.message}`,
        error: process.env.NODE_ENV === 'development' ? mailError.message : undefined
      });
    }
  } catch (error) {
    logger.error('發送單個邀請函處理過程中出錯', { 
      error: error.message,
      stack: error.stack,
      code: error.code,
      guestId: req.params.guestId,
      phase: '整體處理'
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤，無法處理發送請求', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 