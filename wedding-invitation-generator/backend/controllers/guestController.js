/**
 * Guest Controller Module
 * 
 * Handles all operations related to guest management:
 * - Creating new guests
 * - Retrieving guest information (individual or all)
 * - Updating guest details
 * - Deleting guests
 * 
 * Each guest is associated with a couple's wedding and includes
 * personalized information used for invitation generation.
 */
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Create a New Guest
 * 
 * Adds a new guest to the database with their relationship to the couple
 * and other personal details that will be used for invitation generation.
 * 
 * @route POST /api/guests
 * @param {Object} req.body - Guest information including name, relationship, and personal details
 * @param {string} req.body.coupleInfoId - ID of the couple this guest is associated with
 * @returns {Object} The created guest record
 */
exports.createGuest = async (req, res) => {
  try {
    const { 
      name, relationship, email, preferences,
      howMet, memories, coupleInfoId 
    } = req.body;
    
    // Verify that the referenced couple exists
    const coupleExists = await prisma.coupleInfo.findUnique({
      where: { id: coupleInfoId }
    });
    
    if (!coupleExists) {
      logger.warn('Create guest failed: couple not found', { coupleInfoId });
      return res.status(404).json({ message: '找不到對應的新人資料' });
    }
    
    // Create the guest record with initial "pending" status
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

/**
 * Get All Guests
 * 
 * Retrieves all guests, optionally filtered by couple ID.
 * Results are ordered with most recently created guests first.
 * 
 * @route GET /api/guests
 * @param {string} [req.query.coupleInfoId] - Optional couple ID to filter guests
 * @returns {Array} List of guest records
 */
exports.getAllGuests = async (req, res) => {
  try {
    const { coupleInfoId } = req.query;
    
    // Filter by coupleInfoId if provided
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

/**
 * Get Guest by ID
 * 
 * Retrieves a specific guest by ID, including related couple information.
 * 
 * @route GET /api/guests/:id
 * @param {string} req.params.id - ID of the guest to retrieve
 * @returns {Object} Guest record with related couple information
 */
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

/**
 * Update Guest Information
 * 
 * Updates an existing guest's information.
 * Note that this doesn't modify the invitation content directly;
 * That's handled by the invitation controller.
 * 
 * @route PUT /api/guests/:id
 * @param {string} req.params.id - ID of the guest to update
 * @param {Object} req.body - Updated guest information
 * @returns {Object} Updated guest record
 */
exports.updateGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, relationship, email, preferences,
      howMet, memories 
    } = req.body;
    
    // Verify guest exists before updating
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

/**
 * Delete Guest
 * 
 * Removes a guest from the database.
 * This will also delete any associated invitation data.
 * 
 * @route DELETE /api/guests/:id
 * @param {string} req.params.id - ID of the guest to delete
 * @returns {Object} Success message
 */
exports.deleteGuest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify guest exists before deletion
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

/**
 * Update Guest Status
 * 
 * Updates the RSVP status of a guest (pending, confirmed, declined).
 * This endpoint is typically called when a guest responds to an invitation.
 * 
 * @route PATCH /api/guests/:id/status
 * @param {string} req.params.id - ID of the guest to update
 * @param {string} req.body.status - New status (pending, confirmed, declined)
 * @returns {Object} Updated guest record with new status
 */
exports.updateGuestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'declined'];
    if (!validStatuses.includes(status)) {
      logger.warn('Invalid status provided', { status, id });
      return res.status(400).json({ 
        message: '無效的賓客狀態', 
        validValues: validStatuses 
      });
    }
    
    // Verify guest exists before updating status
    const guestExists = await prisma.guest.findUnique({
      where: { id }
    });
    
    if (!guestExists) {
      logger.warn('Update status failed: guest not found', { id });
      return res.status(404).json({ message: '找不到此賓客' });
    }
    
    const guest = await prisma.guest.update({
      where: { id },
      data: { status }
    });
    
    logger.info('Guest status updated', { 
      id, 
      oldStatus: guestExists.status,
      newStatus: status
    });
    
    res.status(200).json(guest);
  } catch (error) {
    logger.error('Update guest status error', { 
      error: error.message,
      stack: error.stack,
      id: req.params.id,
      status: req.body.status
    });
    
    res.status(500).json({ 
      message: '伺服器錯誤', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bulk Import Guests
 * 
 * Imports multiple guests from a provided data array.
 * Each guest must have the required fields and will be associated with the specified couple.
 * 
 * @route POST /api/guests/bulk
 * @param {Array} req.body.guests - Array of guest objects to import
 * @param {string} req.body.coupleInfoId - ID of the couple these guests are associated with
 * @returns {Object} Result with count of successfully imported guests
 */
exports.bulkImportGuests = async (req, res) => {
  try {
    const { guests, coupleInfoId } = req.body;
    
    if (!Array.isArray(guests) || guests.length === 0) {
      logger.warn('Bulk import failed: invalid guests array', { 
        provided: typeof guests,
        coupleInfoId
      });
      return res.status(400).json({ message: '需要提供有效的賓客陣列' });
    }
    
    // Verify that the referenced couple exists
    const coupleExists = await prisma.coupleInfo.findUnique({
      where: { id: coupleInfoId }
    });
    
    if (!coupleExists) {
      logger.warn('Bulk import failed: couple not found', { coupleInfoId });
      return res.status(404).json({ message: '找不到對應的新人資料' });
    }
    
    // Process each guest in the array
    const createdGuests = [];
    const errors = [];
    
    for (const guestData of guests) {
      try {
        // Validate required fields
        if (!guestData.name || !guestData.email || !guestData.relationship) {
          errors.push({
            guest: guestData,
            error: '缺少必要欄位 (name, email, relationship)'
          });
          continue;
        }
        
        // Create guest with association to couple
        const guest = await prisma.guest.create({
          data: {
            name: guestData.name,
            email: guestData.email,
            relationship: guestData.relationship,
            preferences: guestData.preferences || null,
            howMet: guestData.howMet || null,
            memories: guestData.memories || null,
            status: 'pending',
            coupleInfo: { connect: { id: coupleInfoId } }
          }
        });
        
        createdGuests.push(guest);
      } catch (guestError) {
        errors.push({
          guest: guestData,
          error: guestError.message
        });
      }
    }
    
    logger.info('Bulk guest import completed', {
      total: guests.length,
      successful: createdGuests.length,
      failed: errors.length,
      coupleInfoId
    });
    
    res.status(201).json({
      message: '批量匯入賓客完成',
      totalImported: createdGuests.length,
      totalFailed: errors.length,
      errors: process.env.NODE_ENV === 'development' ? errors : undefined
    });
  } catch (error) {
    logger.error('Bulk import guests error', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      message: '伺服器錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 