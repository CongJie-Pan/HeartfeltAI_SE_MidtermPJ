/**
 * Couple Controller Module
 * 
 * Handles all operations related to couple information:
 * - Creating and updating couple profiles
 * - Retrieving couple information
 * - Managing wedding details
 * 
 * This controller uses Prisma ORM for database operations
 * and implements proper error handling and logging.
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Create or Update Couple Information
 * 
 * This function either creates a new couple profile if none exists,
 * or updates an existing one. The system is designed to support a single
 * couple (wedding) at a time for simplicity.
 * 
 * @route POST /api/couples
 * @param {Object} req.body - Contains couple information (names, dates, venue, etc.)
 * @returns {Object} The created or updated couple record
 */
exports.createOrUpdateCouple = async (req, res) => {
  try {
    const { 
      groomName, brideName, weddingDate, weddingTime,
      weddingLocation, weddingTheme, backgroundStory 
    } = req.body;
    
    // Check if a couple record already exists (simplified single-user system)
    let couple = await prisma.coupleInfo.findFirst();
    
    if (couple) {
      // Update existing record
      couple = await prisma.coupleInfo.update({
        where: { id: couple.id },
        data: { 
          groomName, brideName, weddingDate: new Date(weddingDate), weddingTime,
          weddingLocation, weddingTheme, backgroundStory 
        }
      });
      
      logger.info('Couple info updated', { coupleId: couple.id });
    } else {
      // Create new record
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
    // Log the error with detailed information for debugging
    logger.error('Create couple error', { 
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    // Return error response with appropriate message
    // Only include error details in development environment
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get Couple Information
 * 
 * Retrieves the first couple record from the database.
 * Since this is a simplified system supporting one couple at a time,
 * we just return the first record found.
 * 
 * @route GET /api/couples
 * @returns {Object} The couple information or 404 if not found
 */
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

/**
 * Get Couple by ID
 * 
 * Retrieves a specific couple record by ID.
 * This could be used for multiple wedding support in the future.
 * 
 * @route GET /api/couples/:id
 * @param {string} req.params.id - The couple ID to retrieve
 * @returns {Object} The couple information or 404 if not found
 */
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