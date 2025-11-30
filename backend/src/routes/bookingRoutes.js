const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Log khi routes được load
console.log('Booking routes loaded');

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// Tạo booking mới (user) - ĐẶT TRƯỚC
router.post('/', (req, res, next) => {
  console.log('POST /api/bookings route matched');
  next();
}, bookingController.createBooking.bind(bookingController));

// Kiểm tra phòng có sẵn - ĐẶT TRƯỚC /:id để tránh conflict
router.get('/check-availability', (req, res, next) => {
  console.log('GET /api/bookings/check-availability route matched');
  next();
}, bookingController.checkRoomAvailability.bind(bookingController));

// Lấy danh sách booking của guest
router.get('/my-bookings', bookingController.getGuestBookings.bind(bookingController));

// Lấy danh sách bookings có thể yêu cầu hoàn tiền
router.get('/refundable', bookingController.getRefundableBookings.bind(bookingController));

// Lấy danh sách booking của host (chỉ host)
router.get(
  '/host-bookings',
  authorize('host'),
  bookingController.getHostBookings.bind(bookingController)
);

// Host lấy danh sách yêu cầu hoàn tiền
router.get(
  '/host-refund-requests',
  authorize('host'),
  bookingController.getHostRefundRequests.bind(bookingController)
);

// Host xử lý yêu cầu hoàn tiền (approve/reject)
router.post(
  '/:id/process-host-refund',
  authorize('host'),
  bookingController.processHostRefundRequest.bind(bookingController)
);

// Lấy tất cả bookings (admin only) - ĐẶT TRƯỚC /:id để tránh conflict
router.get(
  '/admin-bookings',
  authorize('admin'),
  bookingController.getAllBookings.bind(bookingController)
);

// Lấy danh sách yêu cầu hoàn tiền (admin only) - ĐẶT TRƯỚC /:id
router.get(
  '/refund-requests',
  authorize('admin'),
  bookingController.getRefundRequests.bind(bookingController)
);

// Lấy booking theo ID
router.get('/:id', bookingController.getBookingById.bind(bookingController));

// Cập nhật status booking
router.put('/:id/status', bookingController.updateBookingStatus.bind(bookingController));

// Cập nhật payment status (tự động transfer tiền cho host nếu status = 'paid')
router.put('/:id/payment-status', bookingController.updatePaymentStatus.bind(bookingController));

// User gửi yêu cầu hoàn tiền
router.post('/:id/request-refund', bookingController.requestRefund.bind(bookingController));

// Xử lý hoàn tiền thủ công (admin only)
router.post(
  '/:id/refund',
  authorize('admin'),
  bookingController.processManualRefund.bind(bookingController)
);

// Xử lý chuyển tiền cho host khi booking paid (có thể được gọi từ payment webhook)
router.post(
  '/:id/process-host-payment',
  bookingController.processHostPayment.bind(bookingController)
);

// Thanh toán bằng ví
router.post(
  '/:id/pay-with-wallet',
  bookingController.payWithWallet.bind(bookingController)
);

module.exports = router;

