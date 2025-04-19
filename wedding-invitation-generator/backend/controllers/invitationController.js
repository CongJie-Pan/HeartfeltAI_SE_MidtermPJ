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
const { OpenAI } = require('openai');
const { validationResult } = require('express-validator');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

/**
 * Invitation cache with 1-hour expiration
 * Used to store generated invitations to reduce API calls
 * and improve response times for frequently accessed invitations
 */
const invitationCache = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false
});

/**
 * Initialize DeepSeek API client (via OpenAI SDK)
 * The system uses DeepSeek's API for generating natural-sounding invitations,
 * but falls back to mock data if the API is not configured
 */
let openai;
try {
  openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
  });
} catch (error) {
  logger.error('Failed to initialize DeepSeek API', { error: error.message });
}

// Initialize Prisma client for database operations
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
      
      // Calculate exponential delay - increases with each retry attempt
      const delay = Math.pow(2, retries) * 1000; // Exponential delay (1s, 2s, 4s...)
      logger.info(`Retry ${retries}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Enhanced Validation Error Handler
 * 
 * Validates request data and handles validation errors with detailed logging.
 * This function demonstrates the validation error handling pattern that
 * should be used throughout the application.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} true if validation passes, false if validation fails
 */
function validateRequestData(req, res) {
  // Use express-validator to check input
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Generate a unique error ID for tracing
    const errorId = `INV-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    
    // Extract detailed validation information
    const validationErrors = errors.array().map(error => ({
      field: error.param,
      value: error.value,
      message: error.msg,
      location: error.location
    }));
    
    // Log detailed error information for debugging
    logger.warn(`Invitation request validation failed [${errorId}]`, {
      errorId,
      validationErrors,
      requestPath: req.path,
      requestMethod: req.method,
      rawBody: JSON.stringify(req.body),
      clientIp: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log each specific validation error with context
    validationErrors.forEach(error => {
      logger.debug(`Field validation error [${errorId}]`, {
        field: error.field,
        receivedValue: error.value,
        errorMessage: error.message,
        expectedFormat: getExpectedFormat(error.field)
      });
    });
    
    // Return user-friendly error response with reference ID
    res.status(400).json({
      message: '輸入資料有誤，無法處理邀請函請求',
      errors: validationErrors.map(e => ({ field: e.field, message: e.message })),
      referenceId: errorId
    });
    
    return false;
  }
  
  return true;
}

/**
 * Determines expected format for fields based on field name
 * Helps provide more context in error logs
 * 
 * @param {string} fieldName - Name of the field being validated
 * @returns {string} Expected format description
 */
function getExpectedFormat(fieldName) {
  const formatGuide = {
    guestId: 'UUID v4 format (e.g. 123e4567-e89b-12d3-a456-426614174000)',
    coupleInfoId: 'UUID v4 format',
    invitationContent: 'Non-empty string with invitation text',
    feedbackText: 'Optional string with user feedback'
  };
  
  return formatGuide[fieldName] || 'Valid format for this field type';
}

/**
 * Generate Invitation for a Guest
 * 
 * Creates a personalized wedding invitation for a specific guest.
 * Uses AI to generate contextually appropriate invitation text based on
 * the relationship between the guest and the couple.
 * 
 * Features:
 * - Enhanced input validation with detailed error logging
 * - AI-powered content generation with appropriate prompts
 * - Caching to improve performance and reduce API costs
 * - Graceful fallback to mock content if the AI service is unavailable
 * 
 * @route POST /api/invitations/generate
 * @param {Object} req - Express request object with guest information
 * @param {Object} res - Express response object
 * @returns {Object} The generated invitation with status information
 */
exports.generateInvitation = async (req, res) => {
  try {
    // Enhanced validation with detailed error logging and handling
    if (!validateRequestData(req, res)) {
      // If validation fails, the function will already send the response
      return;
    }
    
    const { guestId } = req.body;
    const forceRegenerate = req.query.force === 'true';
    
    // Trace ID for logging
    const traceId = `GEN-${Date.now().toString(36).substring(2, 9)}`;
    
    logger.info(`Starting invitation generation process [${traceId}]`, {
      guestId, 
      forceRegenerate,
      traceId
    });
    
    // Check if invitation is already in cache
    const cacheKey = `invitation:${guestId}`;
    if (!forceRegenerate && invitationCache.has(cacheKey)) {
      const cachedInvitation = invitationCache.get(cacheKey);
      
      logger.info(`Returning cached invitation [${traceId}]`, {
        guestId,
        cacheHit: true,
        traceId
      });
      
      return res.status(200).json({
        message: '已成功取得邀請函',
        invitation: cachedInvitation,
        source: 'cache'
      });
    }
    
    // Get guest information from database
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { coupleInfo: true }
    });
    
    // Check if guest exists
    if (!guest) {
      logger.warn(`Guest not found [${traceId}]`, { guestId, traceId });
      return res.status(404).json({ message: '找不到此賓客資料' });
    }
    
    // Check if guest already has an invitation and we're not forcing regeneration
    if (!forceRegenerate && guest.invitationContent) {
      logger.info(`Guest already has invitation [${traceId}]`, {
        guestId,
        status: guest.status,
        traceId
      });
      
      // Store in cache for future requests
      invitationCache.set(cacheKey, guest.invitationContent);
      
      return res.status(200).json({
        message: '已存在邀請函',
        invitation: guest.invitationContent,
        source: 'database'
      });
    }
    
    // Generate invitation content using AI
    let invitationContent;
    try {
      // Log the attempt to generate content using AI
      logger.info(`Attempting to generate invitation with AI [${traceId}]`, {
        guestName: guest.name,
        relationship: guest.relationship,
        traceId
      });
      
      invitationContent = await generateInvitationWithAI(guest, guest.coupleInfo);
      
      logger.info(`AI generation successful [${traceId}]`, {
        guestId,
        contentLength: invitationContent.length,
        traceId
      });
    } catch (aiError) {
      // Log AI generation failure
      logger.error(`AI invitation generation failed [${traceId}]`, {
        error: aiError.message,
        stack: aiError.stack,
        guestId,
        traceId
      });
      
      // Fall back to mock content
      invitationContent = generateMockInvitation(guest, guest.coupleInfo);
      
      logger.info(`Fallback to mock content [${traceId}]`, {
        guestId,
        contentLength: invitationContent.length,
        traceId
      });
    }
    
    // Update guest record with generated invitation
    await prisma.guest.update({
      where: { id: guestId },
      data: {
        invitationContent,
        status: 'generated',
        updatedAt: new Date()
      }
    });
    
    // Store in cache
    invitationCache.set(cacheKey, invitationContent);
    
    logger.info(`Invitation generation complete [${traceId}]`, {
      guestId,
      contentLength: invitationContent.length,
      traceId
    });
    
    // Return response
    res.status(200).json({
      message: '邀請函已成功生成',
      invitation: invitationContent,
      source: 'newly_generated'
    });
  } catch (error) {
    // Log unexpected errors
    logger.error('Error generating invitation', {
      error: error.message,
      stack: error.stack,
      guestId: req.body?.guestId
    });
    
    res.status(500).json({
      message: '生成邀請函時發生錯誤',
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
    const { invitationContent, feedbackText } = req.body;
    
    // Verify guest exists before attempting update
    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { coupleInfo: true }
    });
    
    if (!guest) {
      logger.warn('Update invitation failed: guest not found', { guestId });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    let updatedContent = invitationContent;
    
    // If feedback is provided and AI API is available, regenerate invitation using feedback
    if (feedbackText && openai && process.env.DEEPSEEK_API_KEY) {
      try {
        logger.info('Regenerating invitation with user feedback', { guestId, feedbackLength: feedbackText.length });
        
        // Construct a prompt that incorporates the feedback
        const feedbackPrompt = `
請幫我根據以下的反饋，重新編寫婚禮邀請函。

原始邀請函:
${invitationContent}

賓客資料:
- 姓名: ${guest.name}
- 與新人關係: ${guest.relationship}
${guest.preferences ? `- 賓客偏好: ${guest.preferences}` : ''}
${guest.howMet ? `- 相識方式: ${guest.howMet}` : ''}
${guest.memories ? `- 共同回憶: ${guest.memories}` : ''}

用戶反饋:
${feedbackText}

請根據反饋重新製作一封邀請函，著重地融合原邀請函和反饋中提及的內容和要求，而不是附加在末尾。
保持原邀請函的溫暖、優雅風格。請直接提供完整邀請函內容，不要包含任何其他解釋或前後文。
`;

        // Record request start time for performance monitoring
        const startTime = Date.now();
        
        // Call DeepSeek API to regenerate invitation incorporating feedback
        const completion = await openai.chat.completions.create({
          messages: [
            { 
              role: "system", 
              content: "你是一個幫助撰寫婚禮邀請函的專業助手。請根據提供的新人和賓客資訊，生成一封個性化、溫馨且符合關係的邀請函。" 
            },
            { role: "user", content: feedbackPrompt }
          ],
          model: "deepseek-chat",
        });
        
        // Get the regenerated invitation content
        updatedContent = completion.choices[0].message.content;
        
        // Record AI request completion time for performance monitoring
        const aiResponseTime = Date.now() - startTime;
        logger.info('Invitation regenerated with feedback', { 
          guestId,
          responseTime: aiResponseTime,
          contentLength: updatedContent.length
        });
      } catch (error) {
        // Log error but continue with manual update as fallback
        logger.error('Error regenerating invitation with AI, using manual update instead', { 
          error: error.message, 
          guestId,
          feedbackText 
        });
      }
    }
    
    // Update invitation content in database
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        invitationContent: updatedContent,
        status: 'edited' // Mark as manually edited for tracking purposes
      }
    });
    
    // Update cache to maintain consistency
    const cacheKey = `invitation_${guestId}`;
    invitationCache.set(cacheKey, updatedContent);
    
    logger.info('Invitation updated', { guestId });
    
    // Return success response with updated guest data
    res.status(200).json({
      message: '邀請函已更新',
      guest: updatedGuest
    });
  } catch (error) {
    // Handle unexpected errors with detailed logging
    logger.error('Update invitation error', { 
      error: error.message,
      stack: error.stack,
      guestId: req.params.guestId
    });
    
    // Return error response with limited details in production
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate Invitation Content with AI
 * 
 * Creates personalized invitation content using AI services.
 * Implements error handling, retry mechanisms, and performance tracking.
 * 
 * @param {Object} guest - Guest information with relationship data
 * @param {Object} coupleInfo - Information about the couple
 * @returns {Promise<string>} AI-generated invitation content
 * @throws {Error} If AI generation fails after retries
 */
async function generateInvitationWithAI(guest, coupleInfo) {
  // Log tracing ID for this particular AI generation call
  const operationId = `AI-${Date.now().toString(36).substring(2, 7)}`;
  
  logger.debug(`Starting AI invitation generation [${operationId}]`, {
    operationId,
    guestName: guest.name,
    relationship: guest.relationship,
    service: 'deepseek'
  });
  
  // Record request start time for performance monitoring
  const startTime = Date.now();
  
  // Check if API client is available
  if (!openai || !process.env.DEEPSEEK_API_KEY) {
    logger.warn(`DeepSeek API not configured [${operationId}]`);
    throw new Error('AI service not configured');
  }
  
  // Create system prompt with detailed instructions
  const systemPrompt = 
    "You are a professional writer specializing in personalized wedding invitations. " +
    "Create a heartfelt, warm invitation that reflects the relationship between the couple and their guest. " +
    "The tone should be formal but intimate, with cultural sensitivity appropriate for the context. " +
    "Include specific details about the wedding location, date, and time. " +
    "Keep the invitation between 150-250 words and structure it with proper paragraphs.";
  
  // Create user prompt with specific guest and couple details
  const userPrompt = `
Please write a wedding invitation for this guest:
- Guest Name: ${guest.name}
- Relationship to Couple: ${guest.relationship}
- Email: ${guest.email}

Wedding Details:
- Groom's Name: ${coupleInfo.groomName}
- Bride's Name: ${coupleInfo.brideName}
- Wedding Date: ${coupleInfo.weddingDate.toISOString().split('T')[0]}
- Wedding Time: ${coupleInfo.weddingTime}
- Wedding Location: ${coupleInfo.weddingLocation}
- Wedding Theme: ${coupleInfo.weddingTheme}

The invitation should be written in Traditional Chinese (繁體中文).
Make the invitation personal, mentioning the specific relationship with the couple.
`;
  
  try {
    // Define API call function with retry capabilities
    const generateContent = async () => {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "deepseek-reasoner",
        temperature: 0.7, // Add some creativity but not too random
        max_tokens: 500,
        // Add request metadata for tracking
        user: operationId
      });
      
      return completion.choices[0].message.content.trim();
    };
    
    // Execute with retry mechanism for transient failures
    const content = await executeWithRetry(generateContent, 3, 1000);
    
    // Calculate and log performance metrics
    const duration = Date.now() - startTime;
    logger.info(`AI invitation generation successful [${operationId}]`, {
      operationId,
      durationMs: duration,
      contentLength: content.length,
      service: 'deepseek'
    });
    
    return content;
  } catch (error) {
    // Log detailed error information
    logger.error(`AI invitation generation failed [${operationId}]`, {
      operationId,
      errorMessage: error.message,
      errorCode: error.code,
      statusCode: error.status,
      durationMs: Date.now() - startTime,
      service: 'deepseek'
    });
    
    // Rethrow with context for higher-level handling
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

/**
 * Generate Mock Invitation Content
 * 
 * Fallback function that creates a template-based invitation
 * when AI generation is unavailable or fails.
 * 
 * @param {Object} guest - Guest information
 * @param {Object} coupleInfo - Information about the couple
 * @returns {string} Template-based invitation content
 */
function generateMockInvitation(guest, coupleInfo) {
  // Format wedding date
  const weddingDate = coupleInfo.weddingDate.toISOString().split('T')[0];
  
  // Create personalized greeting based on relationship
  let greeting;
  if (guest.relationship.includes('親') || guest.relationship.includes('家人')) {
    greeting = `親愛的${guest.name}：`;
  } else if (guest.relationship.includes('朋友')) {
    greeting = `摯友 ${guest.name}：`;
  } else if (guest.relationship.includes('老師') || guest.relationship.includes('長輩')) {
    greeting = `敬愛的${guest.name}：`;
  } else if (guest.relationship.includes('同事') || guest.relationship.includes('同學')) {
    greeting = `親愛的${guest.name}：`;
  } else {
    greeting = `尊敬的${guest.name}：`;
  }
  
  // Build invitation content from template
  const invitationContent = `${greeting}

值此人生重要時刻，${coupleInfo.groomName}與${coupleInfo.brideName}誠摯邀請您參加我們的婚禮。

婚禮將於${weddingDate}日${coupleInfo.weddingTime}在${coupleInfo.weddingLocation}舉行。今日喜事，承蒙${guest.relationship}到場，喜氣洋洋，蓬蓽生輝。

您與我們${guest.relationship}的深厚情誼，讓這一天因您的出席而更加完美。婚禮主題為「${coupleInfo.weddingTheme}」，期待您的參與，讓我們一起分享這幸福時刻。

期待您的光臨，共享這一生中最特別的一天。

${coupleInfo.groomName} & ${coupleInfo.brideName} 敬上`;

  // Log mock content generation
  logger.info('Generated mock invitation content', {
    guestId: guest.id,
    guestName: guest.name,
    relationshipType: guest.relationship,
    contentLength: invitationContent.length
  });
  
  return invitationContent;
}

/**
 * Execute Function with Exponential Backoff Retry
 * 
 * Utility function that implements retry logic with exponential backoff.
 * Useful for handling transient failures in external API calls.
 * 
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelayMs - Base delay in milliseconds between retries
 * @returns {Promise<any>} Result of the function execution
 * @throws {Error} If all retry attempts fail
 */
async function executeWithRetry(fn, maxRetries = 3, baseDelayMs = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't delay if this was the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate exponential backoff delay with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
      
      // Log retry attempt
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`, {
        errorMessage: error.message,
        errorCode: error.code,
        attempt: attempt + 1,
        maxRetries,
        delayMs: Math.round(delay)
      });
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  throw lastError;
} 