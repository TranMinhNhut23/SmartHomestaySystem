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

// Lấy danh sách booking của host (chỉ host)
router.get(
  '/host-bookings',
  authorize('host'),
  bookingController.getHostBookings.bind(bookingController)
);

// Lấy tất cả bookings (admin only) - ĐẶT TRƯỚC /:id để tránh conflict
router.get(
  '/admin-bookings',
  authorize('admin'),
  bookingController.getAllBookings.bind(bookingController)
);

// Lấy booking theo ID
router.get('/:id', bookingController.getBookingById.bind(bookingController));

// Cập nhật status booking
router.put('/:id/status', bookingController.updateBookingStatus.bind(bookingController));

module.exports = router;

