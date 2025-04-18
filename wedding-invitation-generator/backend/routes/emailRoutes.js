/**
 * Email Delivery Routes
 * 
 * This module defines API endpoints for sending wedding invitations via email.
 * These routes handle both bulk sending to all guests and sending to individual guests.
 * 
 * All routes are prefixed with '/api/emails' from the main application.
 */
const express = require('express');
const emailController = require('../controllers/emailController');
const validationSchemas = require('../middlewares/validator');

// Create Express router
const router = express.Router();

/**
 * Send Invitations to All Guests
 * 
 * POST /api/emails/send
 * 
 * Sends wedding invitations to all guests with generated or edited invitations.
 * Uses HTML email templates with the invitation content.
 * Updates each guest's status to "sent" after successful delivery.
 * 
 * Request body must include:
 * - coupleInfoId: UUID of the couple whose guests will receive invitations
 * 
 * Query parameters:
 * - testMode (optional): Set to 'true' to simulate sending without actual delivery
 * 
 * Returns a summary of successful and failed deliveries.
 */
router.post('/send', validationSchemas.sendInvitation, emailController.sendInvitation);

/**
 * Send Invitation to a Single Guest
 * 
 * POST /api/emails/send/:guestId
 * 
 * Sends a wedding invitation to a specific guest.
 * Useful for testing or sending individual reminders.
 * Updates the guest's status to "sent" after successful delivery.
 * 
 * Path parameters:
 * - guestId: UUID of the guest to send invitation to
 * 
 * Query parameters:
 * - testMode (optional): Set to 'true' to simulate sending without actual delivery
 * 
 * Returns a 404 error if no guest with the given ID is found.
 * Returns a 400 error if the guest does not have an invitation generated yet.
 */
router.post('/send/:guestId', validationSchemas.sendSingleInvitation, emailController.sendSingleInvitation);

module.exports = router; 