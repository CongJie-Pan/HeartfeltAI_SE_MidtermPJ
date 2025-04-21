/**
 * Invitation Controller Module
 * 
 * Handles the generation and management of wedding invitations:
 * - Generating personalized invitations using AI
 * - Updating invitation content
 * - Caching invitation data to improve performance
 * 
 * Uses the OpenAI API for natural language generation and
 * implements caching, error handling, and retry mechanisms.
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const NodeCache = require('node-cache');
const OpenAI = require('openai');
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
 * Initialize OpenAI API client
 * The system uses OpenAI's API for generating natural-sounding invitations,
 * but falls back to mock data if the API is not configured
 */
let openai;
try {
  // Configuration options for OpenAI client
  const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY,
    // If using Azure OpenAI or other OpenAI-compatible endpoint
    // Uncomment and configure these if needed
    // baseURL: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
    // defaultHeaders: {
    //   'api-key': process.env.OPENAI_API_KEY
    // }
  };
  
  // Initialize the OpenAI client with proper configuration
  openai = new OpenAI(openaiConfig);
  
  logger.info('OpenAI API client initialized successfully', {
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    backupKeyConfigured: !!process.env.DEEPSEEK_API_KEY,
    apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'not available',
    // baseURL: openaiConfig.baseURL || 'default'
  });
} catch (error) {
  logger.error('Failed to initialize OpenAI API', { 
    error: error.message,
    stack: error.stack
  });
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
- 不需要再信件提及電子郵件地址
- 不需要使用markdown格式輸出

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
    let guest;
    try {
      guest = await prisma.guest.findUnique({
        where: { id: guestId },
        include: { coupleInfo: true }
      });
      
      // Log database query result
      logger.debug(`Database query result for guest [${traceId}]`, {
        guestId,
        found: !!guest,
        traceId,
        dbModelVersion: process.env.PRISMA_SCHEMA_VERSION || 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      // Log detailed database error, possibly related to migration
      logger.error(`Database error when fetching guest [${traceId}]`, {
        error: dbError.message,
        stack: dbError.stack,
        guestId,
        traceId,
        dbErrorCode: dbError.code,
        dbErrorMeta: dbError.meta,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        message: '讀取賓客資料時發生資料庫錯誤',
        errorCode: 'DB_FETCH_ERROR',
        referenceId: traceId
      });
    }
    
    // Check if guest exists
    if (!guest) {
      logger.warn(`Guest not found [${traceId}]`, { guestId, traceId });
      return res.status(404).json({ message: '找不到此賓客資料' });
    }
    
    // Check if the related data is complete - possibly pointing to database migration issues
    if (!guest.coupleInfo) {
      logger.error(`Guest found but missing coupleInfo relation [${traceId}]`, {
        guestId,
        traceId,
        guestData: JSON.stringify({
          name: guest.name,
          email: guest.email,
          relationship: guest.relationship,
          coupleInfoId: guest.coupleInfoId
        }),
        possibleCause: 'Database migration issue - relation not properly mapped'
      });
      
      return res.status(500).json({
        message: '賓客關聯資料不完整，無法生成邀請函',
        errorCode: 'RELATION_DATA_MISSING',
        referenceId: traceId
      });
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
    try {
      const beforeUpdate = new Date();
      
      const updatedGuest = await prisma.guest.update({
        where: { id: guestId },
        data: {
          invitationContent,
          status: 'generated',
          updatedAt: new Date()
        }
      });
      
      const updateDuration = new Date() - beforeUpdate;
      
      // Log database update result details
      logger.info(`Database update completed [${traceId}]`, {
        guestId,
        success: !!updatedGuest,
        updateDuration,
        contentSaved: updatedGuest.invitationContent === invitationContent,
        contentLength: updatedGuest.invitationContent?.length,
        traceId
      });
      
      // If the saved content differs from the generated content, log a warning
      if (updatedGuest.invitationContent !== invitationContent) {
        logger.warn(`Saved invitation content differs from generated content [${traceId}]`, {
          guestId,
          generatedLength: invitationContent.length,
          savedLength: updatedGuest.invitationContent?.length,
          traceId,
          possibleCause: 'Database schema issue or truncation'
        });
      }
    } catch (dbUpdateError) {
      // Log detailed database update error, possibly related to migration and model structure
      logger.error(`Failed to save invitation to database [${traceId}]`, {
        error: dbUpdateError.message,
        stack: dbUpdateError.stack,
        errorCode: dbUpdateError.code,
        errorMeta: dbUpdateError.meta,
        guestId,
        contentLength: invitationContent?.length,
        traceId,
        timestamp: new Date().toISOString(),
        prismaModelMetadata: {
          version: process.env.PRISMA_SCHEMA_VERSION || 'unknown',
          modelName: 'Guest',
          fieldName: 'invitationContent'
        }
      });
      
      // Even if saving to the database fails, still return the generated invitation content
      return res.status(200).json({
        message: '邀請函已生成但未能保存到資料庫',
        invitation: invitationContent,
        source: 'newly_generated',
        warning: 'database_save_failed',
        referenceId: traceId
      });
    }
    
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
    // 更詳細記錄未預期錯誤
    const errorId = `ERR-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    
    logger.error(`Unexpected error generating invitation [${errorId}]`, {
      errorId,
      error: error.message,
      stack: error.stack,
      guestId: req.body?.guestId,
      query: req.query,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: '生成邀請函時發生錯誤',
      errorId: errorId,
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
    if (feedbackText && openai && process.env.OPENAI_API_KEY) {
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
保持原邀請函的溫暖、優雅風格。
重要: 邀請函文字需要較充分的篇幅，控制在300-400個中文字符之間，不要過於精簡。
在篇幅適中的同時，維持溫暖感和個人化特色，充分表達情感和誠意。
請直接提供完整邀請函內容，不需要使用markdown格式輸出，不要包含任何其他解釋或前後文，以及電子郵件，以及任何個人機密資訊。
`;

        // Record request start time for performance monitoring
        const startTime = Date.now();
        
        // Call OpenAI API to regenerate invitation incorporating feedback
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "Please create a revised wedding invitation based on user feedback. Maintain a warm and elegant tone, aim for 300-400 Chinese characters (not less, not significantly more), and incorporate the user's suggestions into the original text. Focus on emotional depth and personal connection rather than brevity."
            },
            { role: "user", content: feedbackPrompt }
          ],
          max_tokens: 1024,
          temperature: 0.7
        });
        
        // Get the regenerated invitation content
        let newContent = response.choices[0].message.content.trim();
        
        // Check and ensure the content is between 300-400 characters
        if (newContent.length > 400) {
          logger.warn(`Feedback-generated invitation exceeds maximum length`, {
            guestId,
            originalLength: newContent.length,
            maxLength: 400
          });
          
          // Truncate overly long content while preserving a clear and complete ending
          newContent = newContent.substring(0, 380) + '...\n\n' + 
                      `${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName} 敬上`;
        } else if (newContent.length < 300) {
          logger.warn(`Feedback-generated invitation is shorter than minimum length`, {
            guestId,
            originalLength: newContent.length,
            minLength: 300
          });
        }
        
        updatedContent = newContent;
        
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
    service: 'gpt-4o-mini'
  });
  
  // Record request start time for performance monitoring
  const startTime = Date.now();
  
  // Check if API client is available
  if (!openai || !process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    logger.warn(`OpenAI API not configured [${operationId}]`);
    throw new Error('AI service not configured');
  }
  
  // Check input parameter data integrity - avoid null or undefined values in AI generation
  const missingFields = [];
  if (!guest.name) missingFields.push('guest.name');
  if (!guest.relationship) missingFields.push('guest.relationship');
  if (!coupleInfo.groomName) missingFields.push('coupleInfo.groomName');
  if (!coupleInfo.brideName) missingFields.push('coupleInfo.brideName');
  if (!coupleInfo.weddingDate) missingFields.push('coupleInfo.weddingDate');
  
  if (missingFields.length > 0) {
    const error = new Error(`Missing required fields for AI generation: ${missingFields.join(', ')}`);
    logger.error(`Data integrity issue in AI input [${operationId}]`, {
      operationId,
      missingFields,
      guest: {
        id: guest.id,
        name: guest.name,
        relationship: guest.relationship,
      },
      coupleInfo: {
        id: coupleInfo.id,
        groomName: coupleInfo.groomName,
        brideName: coupleInfo.brideName
      },
      possibleCause: 'Database migration schema change or incomplete data'
    });
    throw error;
  }
  
  // Create system prompt with detailed instructions
  const systemPrompt = 
    "You are a professional writer specializing in personalized wedding invitations. " +
    "Create a heartfelt wedding invitation that deeply reflects the unique relationship between the couple and their guest. " +
    "The invitation must be highly personalized based on the specific relationship and shared memories provided. " +
    "IMPORTANT RULES: " +
    "1. Create a substantial invitation between 300-400 Chinese characters. DO NOT be overly concise. " +
    "2. Focus on emotional depth and personal connection rather than brevity. " +
    "3. ALWAYS incorporate specific personal details provided about the guest (memories, how they met, preferences). " +
    "4. Create a warm, elegant tone appropriate for a wedding. " +
    "5. Include essential wedding details (date, time, location) in a detailed format. " +
    "6. Format with proper paragraph breaks for readability. " +
    "7. Sign with the couple's names at the end." +
    "8. Do not include the guest's email address in the invitation." +
    "9. Do not use markdown format in the invitation.";

  // Create user prompt with specific guest and couple details
  const userPrompt = `
請為以下賓客創作一封個人化的婚禮邀請函:

賓客資料:
- 姓名: ${guest.name}
- 與新人關係: ${guest.relationship}
- 相識方式: ${guest.howMet || '未提供'}
- 共同回憶: ${guest.memories || '未提供'}
- 個人喜好: ${guest.preferences || '未提供'}

婚禮資訊:
- 新郎: ${coupleInfo.groomName}
- 新娘: ${coupleInfo.brideName}
- 婚禮日期: ${coupleInfo.weddingDate.toISOString().split('T')[0]}
- 婚禮時間: ${coupleInfo.weddingTime}
- 婚禮地點: ${coupleInfo.weddingLocation}
- 婚禮主題: ${coupleInfo.weddingTheme}
- 背景故事: ${coupleInfo.backgroundStory || '未提供'}

重要要求:
1. 必須使用繁體中文
2. 邀請函需要較充分的篇幅，控制在300-400個中文字符之間，不要過於精簡
3. 根據賓客資料中的「相識方式」、「共同回憶」和「個人喜好」來個人化邀請函內容
4. 如果提供了「共同回憶」，一定要巧妙融入邀請函中，並做適當展開
5. 結尾署名格式為: ${coupleInfo.groomName} & ${coupleInfo.brideName} 敬上
6. 避免過於制式化的內容，確保邀請函具有獨特性和個人化特色，充分表達情感
7. 不需要使用markdown格式輸出
8. 不需要在信件提及電子郵件地址
`;
  
  try {
    // Define API call function with retry capabilities
    const generateContent = async () => {
      try {
        // Log the start of the API request with full details
        logger.debug(`Sending request to OpenAI API [${operationId}]`, {
          operationId,
          guestId: guest.id,
          modelName: "gpt-4o-mini",
          promptLength: userPrompt.length,
          systemPromptLength: systemPrompt.length,
          apiKeyFirstChars: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 7) + '...' : 'not available',
          timestamp: new Date().toISOString()
        });
        
        const apiRequestStart = Date.now();
        
        // Use chat completions API with modern format
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.7,
          // Add request metadata
          user: operationId
        });
        
        const apiRequestDuration = Date.now() - apiRequestStart;
        
        // Log successful API response
        logger.debug(`OpenAI API response received [${operationId}]`, {
          operationId,
          requestDuration: apiRequestDuration,
          modelUsed: response.model || "gpt-4o-mini",
          responseId: response.id,
          tokenUsage: response.usage,
          timestamp: new Date().toISOString()
        });
        
        // Validate API response format
        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          throw new Error('API response structure invalid');
        }
        
        let content = response.choices[0].message.content.trim();
        
        // Check and ensure the content is between 300-400 characters
        if (content.length > 400) {
          logger.warn(`Generated invitation exceeds maximum length [${operationId}]`, {
            operationId,
            originalLength: content.length,
            maxLength: 400
          });
          
          // Truncate overly long content while preserving a clear and complete ending
          content = content.substring(0, 380) + '...\n\n' + 
                    `${coupleInfo.groomName} & ${coupleInfo.brideName} 敬上`;
        } else if (content.length < 300) {
          logger.warn(`Generated invitation is shorter than minimum length [${operationId}]`, {
            operationId,
            originalLength: content.length,
            minLength: 300,
            contentPreview: content.substring(0, 100) + '...'
          });
        }
        
        // Return the generated content
        return content;
      } catch (error) {
        // Log detailed error information to help with debugging
        logger.error(`API call error in generateContent [${operationId}]`, {
          operationId,
          errorMessage: error.message,
          errorCode: error.code,
          statusCode: error.status,
          errorType: error.constructor.name,
          fullError: JSON.stringify(error),
          timestamp: new Date().toISOString()
        });
        
        // Rethrow for retry mechanism to handle
        throw error;
      }
    };
    
    // Execute with retry mechanism for transient failures
    const content = await executeWithRetry(generateContent, 3, 1000);
    
    // Check and log content quality
    if (!content || content.length < 130) {
      logger.warn(`Generated unusually short content [${operationId}]`, {
        operationId,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 130),
        timestamp: new Date().toISOString()
      });
    }
    
    // Log the final generated content length
    logger.info(`Generated invitation length: ${content.length} characters [${operationId}]`);
    
    // Calculate and log performance metrics
    const duration = Date.now() - startTime;
    logger.info(`AI invitation generation successful [${operationId}]`, {
      operationId,
      durationMs: duration,
      contentLength: content.length,
      service: 'gpt-4o-mini'
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
      service: 'gpt-4o-mini',
      requestData: {
        guestId: guest.id,
        guestName: guest.name,
        relationship: guest.relationship
      },
      apiErrorDetails: error.response?.data || 'No API error details available',
      timestamp: new Date().toISOString()
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
  
  // Add more personalized content based on relationship and available information
  let personalizedContent = '';
  if (guest.howMet) {
    personalizedContent += `還記得我們在${guest.howMet}相識的日子嗎？那段時光仍然歷歷在目，成為我們生命中珍貴的回憶。`;
  }
  
  if (guest.memories) {
    personalizedContent += `我們一起經歷的${guest.memories}，那些笑聲和感動，已經成為我們友誼中不可或缺的一部分。這些共同的記憶讓我們的關係更加深厚，也讓我更加期待能在這個特別的日子與您分享我的喜悅。`;
  }
  
  if (guest.preferences) {
    personalizedContent += `知道您喜愛${guest.preferences}，我們特別在婚禮中安排了相關的元素，希望能讓您在參與我們婚禮的同時也能享受到熟悉的喜好。`;
  }
  
  if (personalizedContent === '') {
    // If no specific details are available, add generic but warm content
    if (guest.relationship.includes('親') || guest.relationship.includes('家人')) {
      personalizedContent = `多年來您給予我們的關愛和支持，一直是我們前進的動力。在這人生的重要時刻，您的祝福對我們格外珍貴。`;
    } else if (guest.relationship.includes('朋友')) {
      personalizedContent = `感謝多年來您的友誼和支持，這段珍貴的情誼讓我們的生活更加豐富多彩。很高興能在人生的這個重要時刻與您分享我們的喜悅。`;
    } else {
      personalizedContent = `非常感謝您在我們生命中扮演的重要角色，您的存在讓我們的生活更加完整。能在這個特別的日子邀請您出席，是我們莫大的榮幸。`;
    }
  }
  
  // Wedding details section with more elaborate description
  const weddingDetails = `婚禮將於${weddingDate}${coupleInfo.weddingTime}在充滿浪漫氛圍的${coupleInfo.weddingLocation}舉行。我們精心準備了以「${coupleInfo.weddingTheme}」為主題的婚禮，融入了我們喜愛的元素，希望能創造一個難忘的時刻。`;
  
  // Closing section with sincere invitation
  const closing = `我們誠摯地邀請您出席這個對我們來說無比重要的典禮，您的蒞臨將為我們的婚禮增添無限光彩。期待在這個充滿愛與祝福的日子裡，能與您一同見證我們人生的新篇章。\n\n懷著感恩與期待的心情`;
  
  // Build invitation content from template with expanded sections
  const invitationContent = `${greeting}\n\n${personalizedContent}\n\n${weddingDetails}\n\n${closing}\n\n${coupleInfo.groomName} & ${coupleInfo.brideName} 敬上`;

  // Log mock content generation
  logger.info('Generated mock invitation content (backup method)', {
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