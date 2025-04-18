const express = require('express');
const guestController = require('../controllers/guestController');
const validationSchemas = require('../middlewares/validator');

const router = express.Router();

// 新增賓客
router.post('/', validationSchemas.guestInfo, guestController.createGuest);

// 獲取所有賓客
router.get('/', guestController.getAllGuests);

// 獲取單一賓客
router.get('/:id', guestController.getGuestById);

// 更新賓客資料
router.put('/:id', guestController.updateGuest);

// 刪除賓客
router.delete('/:id', guestController.deleteGuest);

module.exports = router; 