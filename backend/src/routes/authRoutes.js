const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Đăng ký
router.post('/register', authController.register.bind(authController));

// Đăng nhập
router.post('/login', authController.login.bind(authController));

// Lấy thông tin user hiện tại (cần đăng nhập)
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

module.exports = router;













