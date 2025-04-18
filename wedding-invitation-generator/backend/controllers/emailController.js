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
      }
    });
    
    logger.info('Email transporter initialized');
  } else {
    logger.warn('SMTP settings not properly configured');
  }
} catch (error) {
  logger.error('Failed to initialize email transporter', { error: error.message });
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
    
    // Verify email transport is available
    if (!transporter && testMode !== 'true') {
      logger.error('Send invitation failed: email transporter not available');
      return res.status(500).json({ 
        message: '郵件服務未正確配置，無法發送邀請函' 
      });
    }
    
    // Get couple information
    const couple = await prisma.coupleInfo.findUnique({
      where: { id: coupleInfoId }
    });
    
    if (!couple) {
      logger.warn('Send invitation failed: couple not found', { coupleInfoId });
      return res.status(404).json({ message: '找不到新人資料' });
    }
    
    // Get all guests with generated invitations ready to send
    const guests = await prisma.guest.findMany({
      where: { 
        coupleInfoId,
        invitationContent: { not: null },
        status: { in: ['generated', 'edited'] }
      }
    });
    
    if (guests.length === 0) {
      logger.warn('No guests with invitations to send', { coupleInfoId });
      return res.status(400).json({ 
        message: '沒有可發送的邀請函，請先為賓客生成邀請函' 
      });
    }
    
    logger.info('Sending invitations', { 
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
        const emailHtml = createEmailTemplate(couple, guest, guest.invitationContent);
        
        // If test mode, don't actually send emails
        if (testMode === 'true') {
          logger.info('Test mode: Simulating email send', { 
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
        await transporter.sendMail({
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
        
        logger.info('Email sent successfully', { 
          guestId: guest.id, 
          email: guest.email 
        });
        
        results.success.push({
          guestId: guest.id,
          name: guest.name,
          email: guest.email
        });
      } catch (error) {
        logger.error('Failed to send email', { 
          error: error.message, 
          guestId: guest.id, 
          email: guest.email 
        });
        
        results.failed.push({
          guestId: guest.id,
          name: guest.name,
          email: guest.email,
          error: error.message
        });
      }
    }
    
    // Return results summary
    res.status(200).json({
      message: `邀請函發送完成：${results.success.length}成功，${results.failed.length}失敗`,
      results
    });
  } catch (error) {
    logger.error('Send invitations error', { 
      error: error.message,
      stack: error.stack,
      coupleInfoId: req.body.coupleInfoId
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
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
    
    // Verify email transport is available
    if (!transporter && testMode !== 'true') {
      logger.error('Send invitation failed: email transporter not available');
      return res.status(500).json({ 
        message: '郵件服務未正確配置，無法發送邀請函' 
      });
    }
    
    // Get guest information
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { coupleInfo: true }
    });
    
    if (!guest) {
      logger.warn('Send invitation failed: guest not found', { guestId });
      return res.status(404).json({ message: '找不到賓客資料' });
    }
    
    if (!guest.invitationContent) {
      logger.warn('Send invitation failed: guest has no invitation content', { guestId });
      return res.status(400).json({ message: '此賓客尚未生成邀請函' });
    }
    
    logger.info('Sending single invitation', { 
      guestId, 
      email: guest.email,
      testMode: testMode === 'true'
    });
    
    const emailHtml = createEmailTemplate(guest.coupleInfo, guest, guest.invitationContent);
    
    // If test mode, don't actually send email
    if (testMode === 'true') {
      logger.info('Test mode: Simulating email send', { 
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
    
    // Send the email
    await transporter.sendMail({
      from: `"${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName}" <${process.env.FROM_EMAIL}>`,
      to: guest.email,
      subject: `婚禮邀請 - ${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName}`,
      html: emailHtml
    });
    
    // Update guest status
    await prisma.guest.update({
      where: { id: guestId },
      data: { status: 'sent' }
    });
    
    logger.info('Email sent successfully', { 
      guestId, 
      email: guest.email 
    });
    
    res.status(200).json({
      message: '邀請函發送成功',
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email
      }
    });
  } catch (error) {
    logger.error('Send single invitation error', { 
      error: error.message,
      stack: error.stack,
      guestId: req.params.guestId
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 