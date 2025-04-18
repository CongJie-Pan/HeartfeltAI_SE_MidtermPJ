const express = require('express');
const emailController = require('../controllers/emailController');
const validationSchemas = require('../middlewares/validator');

const router = express.Router();

// 發送邀請函郵件
router.post('/send', validationSchemas.sendInvitation, emailController.sendInvitation);

// 發送單一邀請函郵件
router.post('/send/:guestId', validationSchemas.sendSingleInvitation, emailController.sendSingleInvitation);

module.exports = router; 