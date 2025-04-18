/**
 * Couple Information Routes
 * 
 * This module defines API endpoints for managing couple information.
 * These routes handle creating, updating, and retrieving wedding couple details,
 * which form the foundation of the invitation generation system.
 * 
 * All routes are prefixed with '/api/couple' from the main application.
 */
const express = require('express');
const coupleController = require('../controllers/coupleController');
const validationSchemas = require('../middlewares/validator');

// Create Express router
const router = express.Router();

/**
 * Create or Update Couple Information
 * 
 * POST /api/couple
 * 
 * Creates a new couple record if none exists, or updates the existing record.
 * The system is designed to support a single couple at a time for simplicity.
 * 
 * Request body must include:
 * - groomName: Name of the groom
 * - brideName: Name of the bride
 * - weddingDate: Date of the wedding (ISO format)
 * - weddingTime: Time of the wedding (HH:MM format)
 * - weddingLocation: Venue of the wedding
 * - weddingTheme: Theme of the wedding
 * 
 * Optional fields:
 * - backgroundStory: The couple's story
 * 
 * All fields are validated according to the coupleInfo validation schema.
 */
router.post('/', validationSchemas.coupleInfo, coupleController.createOrUpdateCouple);

/**
 * Get Couple Information
 * 
 * GET /api/couple
 * 
 * Retrieves the first couple record from the database.
 * Since the system is designed for a single couple at a time,
 * this endpoint returns that record without requiring an ID.
 * 
 * Returns a 404 error if no couple information has been created yet.
 */
router.get('/', coupleController.getCouple);

/**
 * Get Couple By ID
 * 
 * GET /api/couple/:id
 * 
 * Retrieves a specific couple record by its ID.
 * This endpoint allows for future expansion to multiple couples.
 * 
 * Path parameters:
 * - id: UUID of the couple record to retrieve
 * 
 * Returns a 404 error if no couple with the given ID is found.
 */
router.get('/:id', coupleController.getCoupleById);

module.exports = router; 