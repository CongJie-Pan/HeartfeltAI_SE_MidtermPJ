const express = require('express');
const coupleController = require('../controllers/coupleController');
const validationSchemas = require('../middlewares/validator');

const router = express.Router();

// 建立/更新新人資料
router.post('/', validationSchemas.coupleInfo, coupleController.createOrUpdateCouple);

// 獲取新人資料
router.get('/', coupleController.getCouple);

// 獲取單一新人資料
router.get('/:id', coupleController.getCoupleById);

module.exports = router; 