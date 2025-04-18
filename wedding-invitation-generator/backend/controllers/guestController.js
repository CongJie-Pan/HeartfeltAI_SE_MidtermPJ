const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

// 新增賓客
exports.createGuest = async (req, res) => {
  try {
    const { 
      name, relationship, email, preferences,
      howMet, memories, coupleInfoId 
    } = req.body;
    
    // 驗證新人資料是否存在
    const coupleExists = await prisma.coupleInfo.findUnique({
      where: { id: coupleInfoId }
    });
    
    if (!coupleExists) {
      logger.warn('Create guest failed: couple not found', { coupleInfoId });
      return res.status(404).json({ message: '找不到對應的新人資料' });
    }
    
    const guest = await prisma.guest.create({
      data: {
        name, relationship, email, preferences,
        howMet, memories, status: 'pending',
        coupleInfo: { connect: { id: coupleInfoId } }
      }
    });
    
    logger.info('Guest created', { 
      guestId: guest.id, 
      name: guest.name,
      email: guest.email
    });
    
    res.status(201).json(guest);
  } catch (error) {
    logger.error('Create guest error', { 
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

// 獲取所有賓客
exports.getAllGuests = async (req, res) => {
  try {
    const { coupleInfoId } = req.query;
    
    const whereClause = coupleInfoId ? { coupleInfoId } : {};
    
    const guests = await prisma.guest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    
    logger.info('Retrieved all guests', { 
      count: guests.length,
      coupleInfoId: coupleInfoId || 'all' 
    });
    
    res.status(200).json(guests);
  } catch (error) {
    logger.error('Get all guests error', { 
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 獲取單一賓客
exports.getGuestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: { coupleInfo: true }
    });
    
    if (!guest) {
      logger.warn('Guest not found', { id });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    logger.info('Retrieved guest by id', { id });
    
    res.status(200).json(guest);
  } catch (error) {
    logger.error('Get guest by id error', { 
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

// 更新賓客資料
exports.updateGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, relationship, email, preferences,
      howMet, memories 
    } = req.body;
    
    // 驗證賓客是否存在
    const guestExists = await prisma.guest.findUnique({
      where: { id }
    });
    
    if (!guestExists) {
      logger.warn('Update guest failed: guest not found', { id });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    const guest = await prisma.guest.update({
      where: { id },
      data: {
        name, relationship, email, preferences,
        howMet, memories
      }
    });
    
    logger.info('Guest updated', { id });
    
    res.status(200).json(guest);
  } catch (error) {
    logger.error('Update guest error', { 
      error: error.message,
      stack: error.stack,
      id: req.params.id,
      body: req.body
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 刪除賓客
exports.deleteGuest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 驗證賓客是否存在
    const guestExists = await prisma.guest.findUnique({
      where: { id }
    });
    
    if (!guestExists) {
      logger.warn('Delete guest failed: guest not found', { id });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    await prisma.guest.delete({
      where: { id }
    });
    
    logger.info('Guest deleted', { id });
    
    res.status(200).json({ message: '賓客已刪除' });
  } catch (error) {
    logger.error('Delete guest error', { 
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