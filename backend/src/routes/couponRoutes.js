const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Validate mã giảm giá (user đã đăng nhập)
router.post(
  '/validate',
  authenticate,
  couponController.validateCoupon.bind(couponController)
);

// Lấy danh sách coupons active (public)
router.get(
  '/active',
  couponController.getActiveCoupons.bind(couponController)
);

// Tạo coupon mới (host và admin)
router.post(
  '/',
  authenticate,
  authorize('host', 'admin'),
  couponController.createCoupon.bind(couponController)
);

// Lấy tất cả coupons (host và admin)
router.get(
  '/',
  authenticate,
  authorize('host', 'admin'),
  couponController.getAllCoupons.bind(couponController)
);

// Lấy coupon theo ID (host và admin)
router.get(
  '/:id',
  authenticate,
  authorize('host', 'admin'),
  couponController.getCouponById.bind(couponController)
);

// Cập nhật coupon (host và admin)
router.put(
  '/:id',
  authenticate,
  authorize('host', 'admin'),
  couponController.updateCoupon.bind(couponController)
);

// Xóa coupon (host và admin)
router.delete(
  '/:id',
  authenticate,
  authorize('host', 'admin'),
  couponController.deleteCoupon.bind(couponController)
);

module.exports = router;

