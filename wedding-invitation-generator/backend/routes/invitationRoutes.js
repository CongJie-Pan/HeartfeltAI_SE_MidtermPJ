const express = require('express');
const invitationController = require('../controllers/invitationController');
const validationSchemas = require('../middlewares/validator');

const router = express.Router();

// 為賓客生成邀請函
router.post('/generate', validationSchemas.generateInvitation, invitationController.generateInvitation);

// 修改邀請函內容
router.put('/:guestId', validationSchemas.updateInvitation, invitationController.updateInvitation);

module.exports = router; 