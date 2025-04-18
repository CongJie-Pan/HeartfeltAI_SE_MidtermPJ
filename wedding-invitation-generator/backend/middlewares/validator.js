const { validationResult, body, param, query } = require('express-validator');
const logger = require('../config/logger');

// 驗證結果處理
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation error', {
      errors: errors.array(),
      body: req.body,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(400).json({
      message: '輸入資料有誤',
      errors: errors.array()
    });
  }
  next();
};

// 驗證方案
const validationSchemas = {
  // 新人資料驗證
  coupleInfo: [
    body('groomName').notEmpty().withMessage('新郎姓名不能為空'),
    body('brideName').notEmpty().withMessage('新娘姓名不能為空'),
    body('weddingDate').isISO8601().withMessage('婚禮日期格式不正確'),
    body('weddingTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('婚禮時間格式不正確'),
    body('weddingLocation').notEmpty().withMessage('婚禮地點不能為空'),
    body('weddingTheme').notEmpty().withMessage('婚禮主題不能為空'),
    handleValidation
  ],
  
  // 賓客資料驗證
  guestInfo: [
    body('name').notEmpty().withMessage('賓客姓名不能為空'),
    body('relationship').notEmpty().withMessage('與新人關係不能為空'),
    body('email').isEmail().withMessage('電子郵件格式不正確'),
    body('coupleInfoId').isUUID().withMessage('新人ID格式不正確'),
    handleValidation
  ],
  
  // 邀請函生成驗證
  generateInvitation: [
    body('guestId').isUUID().withMessage('賓客ID格式不正確'),
    handleValidation
  ],
  
  // 邀請函更新驗證
  updateInvitation: [
    param('guestId').isUUID().withMessage('賓客ID格式不正確'),
    body('invitationContent').notEmpty().withMessage('邀請函內容不能為空'),
    handleValidation
  ],
  
  // 邀請函發送驗證
  sendInvitation: [
    body('coupleInfoId').isUUID().withMessage('新人ID格式不正確'),
    handleValidation
  ],
  
  // 單一邀請函發送驗證
  sendSingleInvitation: [
    param('guestId').isUUID().withMessage('賓客ID格式不正確'),
    handleValidation
  ]
};

module.exports = validationSchemas; 