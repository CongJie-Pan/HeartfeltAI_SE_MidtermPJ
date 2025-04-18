const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

// 建立/更新新人資料
exports.createOrUpdateCouple = async (req, res) => {
  try {
    const { 
      groomName, brideName, weddingDate, weddingTime,
      weddingLocation, weddingTheme, backgroundStory 
    } = req.body;
    
    // 先檢查是否已存在，這裡簡化為單一使用者系統
    let couple = await prisma.coupleInfo.findFirst();
    
    if (couple) {
      // 更新
      couple = await prisma.coupleInfo.update({
        where: { id: couple.id },
        data: { 
          groomName, brideName, weddingDate: new Date(weddingDate), weddingTime,
          weddingLocation, weddingTheme, backgroundStory 
        }
      });
      
      logger.info('Couple info updated', { coupleId: couple.id });
    } else {
      // 建立
      couple = await prisma.coupleInfo.create({
        data: { 
          groomName, brideName, weddingDate: new Date(weddingDate), weddingTime,
          weddingLocation, weddingTheme, backgroundStory 
        }
      });
      
      logger.info('Couple info created', { coupleId: couple.id });
    }
    
    res.status(200).json(couple);
  } catch (error) {
    logger.error('Create couple error', { 
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 獲取新人資料
exports.getCouple = async (req, res) => {
  try {
    const couple = await prisma.coupleInfo.findFirst();
    if (!couple) {
      logger.info('Couple info not found');
      return res.status(404).json({ message: '尚未設置新人資料' });
    }
    
    res.status(200).json(couple);
  } catch (error) {
    logger.error('Get couple error', { 
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 獲取單一新人資料
exports.getCoupleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const couple = await prisma.coupleInfo.findUnique({
      where: { id }
    });
    
    if (!couple) {
      logger.warn('Couple info not found', { id });
      return res.status(404).json({ message: '找不到此新人資料' });
    }
    
    res.status(200).json(couple);
  } catch (error) {
    logger.error('Get couple by id error', { 
      error: error.message,
      stack: error.stack,
      id: req.params.id
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 