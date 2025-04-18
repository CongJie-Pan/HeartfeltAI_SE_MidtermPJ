/**
 * Guest Management Routes
 * 
 * This module defines API endpoints for managing wedding guests.
 * These routes handle creating, retrieving, updating, and deleting guest records,
 * which are essential for generating personalized invitations.
 * 
 * All routes are prefixed with '/api/guests' from the main application.
 */
const express = require('express');
const guestController = require('../controllers/guestController');
const validationSchemas = require('../middlewares/validator');

// Create Express router
const router = express.Router();

/**
 * Create Guest
 * 
 * POST /api/guests
 * 
 * Creates a new guest record associated with a specific couple.
 * The guest information includes personal details and relationship to the couple,
 * which will be used for personalized invitation generation.
 * 
 * Request body must include:
 * - name: Guest's name
 * - relationship: Relationship to the couple
 * - email: Guest's email address
 * - coupleInfoId: UUID of the couple this guest is associated with
 * 
 * Optional fields:
 * - preferences: Any preferences the guest has specified
 * - howMet: Story of how the guest met the couple
 * - memories: Shared memories with the couple
 * 
 * All fields are validated according to the guestInfo validation schema.
 * Guest is created with an initial status of "pending".
 */
router.post('/', validationSchemas.guestInfo, guestController.createGuest);

/**
 * Get All Guests
 * 
 * GET /api/guests
 * 
 * Retrieves a list of all guests, optionally filtered by couple ID.
 * Results are ordered with most recently created guests first.
 * 
 * Query parameters:
 * - coupleInfoId (optional): UUID of the couple to filter guests by
 * 
 * Returns an array of guest records.
 */
router.get('/', guestController.getAllGuests);

/**
 * Get Guest by ID
 * 
 * GET /api/guests/:id
 * 
 * Retrieves a specific guest record by its ID.
 * Includes related couple information in the response.
 * 
 * Path parameters:
 * - id: UUID of the guest to retrieve
 * 
 * Returns a 404 error if no guest with the given ID is found.
 */
router.get('/:id', guestController.getGuestById);

/**
 * Update Guest
 * 
 * PUT /api/guests/:id
 * 
 * Updates an existing guest's information.
 * Can be used to modify personal details before generating an invitation.
 * 
 * Path parameters:
 * - id: UUID of the guest to update
 * 
 * Request body may include any of the guest fields to update.
 * 
 * Returns a 404 error if no guest with the given ID is found.
 */
router.put('/:id', guestController.updateGuest);

/**
 * Delete Guest
 * 
 * DELETE /api/guests/:id
 * 
 * Removes a guest from the database.
 * This will also delete any associated invitation data.
 * 
 * Path parameters:
 * - id: UUID of the guest to delete
 * 
 * Returns a 404 error if no guest with the given ID is found.
 */
router.delete('/:id', guestController.deleteGuest);

module.exports = router; 