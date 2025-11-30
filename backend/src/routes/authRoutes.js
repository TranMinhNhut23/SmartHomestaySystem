const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// Đăng ký với OTP flow
router.post('/register/send-otp', authController.sendOTP.bind(authController));
router.post('/register/verify-otp', authController.verifyOTP.bind(authController));
router.post('/register/resend-otp', authController.resendOTP.bind(authController));

// Đăng ký (backward compatibility - redirect sang sendOTP)
router.post('/register', authController.register.bind(authController));

// Đăng nhập
router.post('/login', authController.login.bind(authController));

// Lấy thông tin user hiện tại (cần đăng nhập)
router.get('/me', authenticate, authController.getCurrentUser.bind(authController));

// Cập nhật thông tin user (cần đăng nhập)
router.put('/profile', authenticate, authController.updateProfile.bind(authController));
router.put('/profile/:userId', authenticate, authController.updateProfile.bind(authController));

// Email change flow (cần đăng nhập)
router.post('/email-change/send-otp', authenticate, authController.sendEmailChangeOTP.bind(authController));
router.post('/email-change/verify-otp', authenticate, authController.verifyEmailChangeOTP.bind(authController));
router.post('/email-change/resend-otp', authenticate, authController.resendEmailChangeOTP.bind(authController));

// Đăng nhập bằng Google
router.post('/google', authController.loginWithGoogle.bind(authController));

// Forgot password flow
router.get('/forgot-password/captcha', authController.generateCaptcha.bind(authController));
router.post('/forgot-password/request', authController.requestPasswordReset.bind(authController));
router.post('/forgot-password/verify-otp', authController.verifyPasswordResetOTP.bind(authController));
router.post('/forgot-password/reset', authController.resetPassword.bind(authController));
router.post('/forgot-password/resend-otp', authController.resendPasswordResetOTP.bind(authController));

module.exports = router;













