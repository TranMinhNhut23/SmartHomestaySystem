const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');

// Log khi routes được load
console.log('Payment routes loaded');

// Tất cả routes đều cần đăng nhập (trừ IPN và return callback)
router.post('/create', (req, res, next) => {
  console.log('POST /api/payments/create route matched');
  next();
}, authenticate, paymentController.createPayment.bind(paymentController));

// IPN callback từ MoMo (không cần authenticate vì có signature verification)
router.post('/momo/ipn', paymentController.handleMoMoIPN.bind(paymentController));

// Return URL sau khi thanh toán (không cần authenticate)
router.get('/momo/return', paymentController.handleMoMoReturn.bind(paymentController));

module.exports = router;

