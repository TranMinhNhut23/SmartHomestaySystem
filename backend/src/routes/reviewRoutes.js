const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// Tạo đánh giá mới (user)
router.post('/', reviewController.createReview.bind(reviewController));

// Lấy đánh giá theo booking ID
router.get('/booking/:bookingId', reviewController.getReviewByBookingId.bind(reviewController));

// Lấy danh sách đánh giá của homestay (public)
router.get('/homestay/:homestayId', reviewController.getHomestayReviews.bind(reviewController));

// Lấy danh sách đánh giá của user
router.get('/my-reviews', reviewController.getUserReviews.bind(reviewController));

// Lấy đánh giá theo ID
router.get('/:id', reviewController.getReviewById.bind(reviewController));

// Cập nhật đánh giá (chỉ owner)
router.put('/:id', reviewController.updateReview.bind(reviewController));

// Xóa đánh giá (chỉ owner)
router.delete('/:id', reviewController.deleteReview.bind(reviewController));

// Host phản hồi đánh giá (chỉ host)
router.post('/:id/host-response', authorize('host'), reviewController.addHostResponse.bind(reviewController));

module.exports = router;
















