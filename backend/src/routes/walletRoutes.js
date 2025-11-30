const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Routes cho user (cần authenticate)

// Lấy thông tin ví
router.get('/', authenticate, walletController.getWallet);

// Lấy lịch sử giao dịch
router.get('/transactions', authenticate, walletController.getTransactions);

// Lấy chi tiết giao dịch
router.get('/transactions/:transactionId', authenticate, walletController.getTransaction);

// Tạo URL thanh toán để nạp tiền qua MoMo
router.post('/deposit/momo', authenticate, walletController.createDepositMoMo);

// Redirect từ MoMo sau khi user hoàn tất thanh toán (không cần authenticate)
router.get('/deposit/momo/redirect', walletController.momoDepositRedirect);

// IPN Callback từ MoMo - server to server (không cần authenticate vì MoMo gọi)
router.post('/deposit/momo/callback', walletController.momoDepositCallback);

// Tạo URL thanh toán để nạp tiền qua VNPay
router.post('/deposit/vnpay', authenticate, walletController.createDepositVNPay);

// Callback từ VNPay (không cần authenticate vì VNPay gọi)
router.get('/deposit/vnpay/callback', walletController.vnpayDepositCallback);

// Rút tiền
router.post('/withdraw', authenticate, walletController.withdraw);

// Routes cho admin

// Lấy thống kê ví
router.get('/stats', authenticate, authorize('admin'), walletController.getWalletStats);

// Khóa ví
router.post('/:userId/lock', authenticate, authorize('admin'), walletController.lockWallet);

// Mở khóa ví
router.post('/:userId/unlock', authenticate, authorize('admin'), walletController.unlockWallet);

module.exports = router;

