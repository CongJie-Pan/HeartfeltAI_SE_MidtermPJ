/**
 * Invitation Generation Routes
 * 
 * This module defines API endpoints for generating and managing wedding invitations.
 * These routes handle AI-powered invitation generation and manual editing of invitations.
 * 
 * All routes are prefixed with '/api/invitations' from the main application.
 */
const express = require('express');
const invitationController = require('../controllers/invitationController');
const validationSchemas = require('../middlewares/validator');

// Create Express router
const router = express.Router();

/**
 * Generate Invitation for Guest
 * 
 * POST /api/invitations/generate
 * 
 * Creates a personalized wedding invitation for a specific guest using AI.
 * The content is generated based on couple information and guest details.
 * Implements caching to improve performance and reduce API costs.
 * 
 * Request body must include:
 * - guestId: UUID of the guest to generate invitation for
 * 
 * Query parameters:
 * - force (optional): Set to 'true' to regenerate even if a cached version exists
 * 
 * The generated invitation is stored in the guest record and the guest's
 * status is updated to "generated".
 */
router.post('/generate', validationSchemas.generateInvitation, invitationController.generateInvitation);

/**
 * Update Invitation Content
 * 
 * PUT /api/invitations/:guestId
 * 
 * Updates a previously generated invitation's content.
 * This allows for manual editing of the AI-generated content.
 * 
 * Path parameters:
 * - guestId: UUID of the guest whose invitation to update
 * 
 * Request body must include:
 * - invitationContent: The edited invitation text
 * 
 * The guest's status is updated to "edited" after modification.
 * Returns a 404 error if no guest with the given ID is found.
 */
router.put('/:guestId', validationSchemas.updateInvitation, invitationController.updateInvitation);

module.exports = router; 