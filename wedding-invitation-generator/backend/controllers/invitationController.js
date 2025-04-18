/**
 * Invitation Controller Module
 * 
 * Handles the generation and management of wedding invitations:
 * - Generating personalized invitations using AI
 * - Updating invitation content
 * - Caching invitation data to improve performance
 * 
 * Uses the DeepSeek AI API for natural language generation and
 * implements caching, error handling, and retry mechanisms.
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const NodeCache = require('node-cache');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

/**
 * Invitation cache with 1-hour expiration
 * Used to store generated invitations to reduce API calls
 * and improve response times for frequently accessed invitations
 */
const invitationCache = new NodeCache({ stdTTL: 3600 });

/**
 * Initialize DeepSeek API client (via OpenAI SDK)
 * The system uses DeepSeek's API for generating natural-sounding invitations,
 * but falls back to mock data if the API is not configured
 */
let openai;
try {
  const OpenAI = require('openai');
  openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
  });
} catch (error) {
  logger.error('Failed to initialize DeepSeek API', { error: error.message });
}

const prisma = new PrismaClient();

/**
 * Create Invitation Prompt
 * 
 * Constructs the AI prompt for generating a personalized invitation
 * Includes relevant data about the couple, wedding, and guest relationship
 * 
 * @param {Object} guest - Guest object with related couple information
 * @returns {string} Formatted prompt for the AI model
 */
const createInvitationPrompt = (guest) => {
  const { coupleInfo } = guest;
  
  return `
請幫我創建一封針對特定賓客的個性化婚禮邀請函。以下是相關信息：

新人資料:
- 新郎: ${coupleInfo.groomName}
- 新娘: ${coupleInfo.brideName}
- 婚禮日期: ${coupleInfo.weddingDate.toISOString().split('T')[0]}
- 婚禮時間: ${coupleInfo.weddingTime}
- 婚禮地點: ${coupleInfo.weddingLocation}
- 婚禮主題: ${coupleInfo.weddingTheme}
${coupleInfo.backgroundStory ? `- 新人背景故事: ${coupleInfo.backgroundStory}` : ''}

賓客資料:
- 姓名: ${guest.name}
- 與新人關係: ${guest.relationship}
${guest.preferences ? `- 賓客偏好: ${guest.preferences}` : ''}
${guest.howMet ? `- 相識方式: ${guest.howMet}` : ''}
${guest.memories ? `- 共同回憶: ${guest.memories}` : ''}

請創建一封約200-300字的邀請函，包含以下要素:
1. 溫馨的問候語，針對賓客與新人的特定關係
2. 誠摯邀請參加婚禮的語句
3. 婚禮日期、時間和地點資訊
4. 根據新人與賓客的關係加入個人化元素(如共同回憶、感謝的話)
5. 期待賓客出席的結語

格式要求:
- 語調要溫暖、優雅且略帶感性
- 字句精煉
- 不需要加入RSVP詳情

請直接提供完整邀請函內容，不要包含任何其他解釋或前後文。
  `;
};

/**
 * Exponential Backoff Retry Mechanism
 * 
 * Implements an exponential backoff strategy for API calls
 * to handle transient failures and rate limits
 * 
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} Result of the function or throws error after max retries
 */
const exponentialBackoff = async (fn, maxRetries = 3) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      
      const delay = Math.pow(2, retries) * 1000; // Exponential delay (1s, 2s, 4s...)
      logger.info(`Retry ${retries}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Generate Invitation
 * 
 * Creates a personalized invitation for a specific guest using AI.
 * Implements caching to improve performance and reduce API costs.
 * Falls back to mock data if the AI API is not configured.
 * 
 * @route POST /api/invitations/generate
 * @param {string} req.body.guestId - ID of the guest to generate invitation for
 * @param {boolean} [req.query.force=false] - Force regeneration, ignoring cache
 * @returns {Object} Generated invitation content and guest information
 */
exports.generateInvitation = async (req, res) => {
  try {
    const { guestId } = req.body;
    const { force } = req.query;
    
    // Check cache first for performance optimization
    const cacheKey = `invitation_${guestId}`;
    const cachedInvitation = invitationCache.get(cacheKey);
    
    if (cachedInvitation && force !== 'true') {
      logger.info('Using cached invitation', { guestId });
      return res.status(200).json({ 
        message: '使用快取的邀請函',
        invitationContent: cachedInvitation,
        cached: true
      });
    }
    
    // Retrieve guest and couple information
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { coupleInfo: true }
    });
    
    if (!guest) {
      logger.warn('Guest not found for invitation generation', { guestId });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    logger.info('Generating invitation started', { 
      guestId, 
      guestName: guest.name 
    });
    
    // Build AI prompt
    const prompt = createInvitationPrompt(guest);
    
    // Record request start time (for performance monitoring)
    const startTime = Date.now();
    
    let invitationContent;
    
    // Check if API client is available
    if (!openai || !process.env.DEEPSEEK_API_KEY) {
      // No API or key configured, return mock content
      invitationContent = `尊敬的${guest.name}：

值此人生重要時刻，${guest.coupleInfo.groomName}與${guest.coupleInfo.brideName}誠摯邀請您參加我們的婚禮。

婚禮將於${guest.coupleInfo.weddingDate.toISOString().split('T')[0]}日${guest.coupleInfo.weddingTime}在${guest.coupleInfo.weddingLocation}舉行。

您與我們${guest.relationship}的深厚情誼，讓這一天因您的出席而更加完美。

期待與您共享這一生中最特別的時刻。

${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName} 敬上`;

      logger.warn('Using mock invitation due to missing DeepSeek API configuration', { guestId });
    } else {
      // Call DeepSeek API to generate invitation
      try {
        const completionFn = async () => {
          const completion = await openai.chat.completions.create({
            messages: [
              { 
                role: "system", 
                content: "你是一個幫助撰寫婚禮邀請函的專業助手。請根據提供的新人和賓客資訊，生成一封個性化、溫馨且符合關係的邀請函。" 
              },
              { role: "user", content: prompt }
            ],
            model: "deepseek-chat",
          });
          
          return completion.choices[0].message.content;
        };
        
        // Use retry mechanism for API calls
        invitationContent = await exponentialBackoff(completionFn);
      } catch (error) {
        logger.error('DeepSeek API error', { 
          error: error.message, 
          stack: error.stack 
        });
        
        return res.status(502).json({
          message: 'AI服務暫時不可用，請稍後再試',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // Record AI request completion time
    const aiResponseTime = Date.now() - startTime;
    
    // Update guest database record
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        invitationContent,
        status: 'generated'
      }
    });
    
    // Store in cache
    invitationCache.set(cacheKey, invitationContent);
    
    logger.info('Invitation generated successfully', { 
      guestId,
      responseTime: aiResponseTime,
      contentLength: invitationContent.length
    });
    
    res.status(200).json({ 
      message: '邀請函生成成功',
      guest: updatedGuest,
      invitationContent
    });
  } catch (error) {
    logger.error('Invitation generation failed', { 
      error: error.message,
      stack: error.stack,
      guestId: req.body.guestId
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update Invitation Content
 * 
 * Allows manual editing of a generated invitation.
 * Updates both the database and cache.
 * 
 * @route PUT /api/invitations/:guestId
 * @param {string} req.params.guestId - ID of the guest whose invitation to update
 * @param {string} req.body.invitationContent - New invitation content
 * @returns {Object} Success message and updated guest information
 */
exports.updateInvitation = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { invitationContent } = req.body;
    
    // Verify guest exists
    const guest = await prisma.guest.findUnique({
      where: { id: guestId }
    });
    
    if (!guest) {
      logger.warn('Update invitation failed: guest not found', { guestId });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    // Update invitation
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        invitationContent,
        status: 'edited'
      }
    });
    
    // Update cache
    const cacheKey = `invitation_${guestId}`;
    invitationCache.set(cacheKey, invitationContent);
    
    logger.info('Invitation updated', { guestId });
    
    res.status(200).json({
      message: '邀請函已更新',
      guest: updatedGuest
    });
  } catch (error) {
    logger.error('Update invitation error', { 
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