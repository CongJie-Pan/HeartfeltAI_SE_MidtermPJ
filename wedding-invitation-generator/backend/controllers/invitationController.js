const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const NodeCache = require('node-cache');
const dotenv = require('dotenv');

// 確保環境變數載入
dotenv.config();

// 邀請函快取 (1小時過期)
const invitationCache = new NodeCache({ stdTTL: 3600 });

// 設置 DeepSeek API 客戶端 (如果整合 OpenAI SDK)
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

// 創建提示詞生成函數
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

// 重試機制
const exponentialBackoff = async (fn, maxRetries = 3) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      
      const delay = Math.pow(2, retries) * 1000; // 指數增長延遲
      logger.info(`Retry ${retries}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// 為賓客生成邀請函
exports.generateInvitation = async (req, res) => {
  try {
    const { guestId } = req.body;
    const { force } = req.query;
    
    // 檢查快取
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
    
    // 獲取賓客和新人資料
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
    
    // 構建提示詞
    const prompt = createInvitationPrompt(guest);
    
    // 記錄請求開始時間（用於性能監控）
    const startTime = Date.now();
    
    let invitationContent;
    
    // 檢查API客戶端是否可用
    if (!openai || !process.env.DEEPSEEK_API_KEY) {
      // 沒有API或密鑰，返回模擬內容
      invitationContent = `尊敬的${guest.name}：

值此人生重要時刻，${guest.coupleInfo.groomName}與${guest.coupleInfo.brideName}誠摯邀請您參加我們的婚禮。

婚禮將於${guest.coupleInfo.weddingDate.toISOString().split('T')[0]}日${guest.coupleInfo.weddingTime}在${guest.coupleInfo.weddingLocation}舉行。

您與我們${guest.relationship}的深厚情誼，讓這一天因您的出席而更加完美。

期待與您共享這一生中最特別的時刻。

${guest.coupleInfo.groomName} & ${guest.coupleInfo.brideName} 敬上`;

      logger.warn('Using mock invitation due to missing DeepSeek API configuration', { guestId });
    } else {
      // 呼叫DeepSeek API生成邀請函
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
        
        // 使用重試機制呼叫API
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
    
    // 記錄AI請求完成時間
    const aiResponseTime = Date.now() - startTime;
    
    // 更新賓客資料庫
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        invitationContent,
        status: 'generated'
      }
    });
    
    // 儲存到快取
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

// 修改邀請函內容
exports.updateInvitation = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { invitationContent } = req.body;
    
    // 驗證賓客是否存在
    const guest = await prisma.guest.findUnique({
      where: { id: guestId }
    });
    
    if (!guest) {
      logger.warn('Update invitation failed: guest not found', { guestId });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    // 更新邀請函
    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        invitationContent,
        status: 'edited'
      }
    });
    
    // 更新快取
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