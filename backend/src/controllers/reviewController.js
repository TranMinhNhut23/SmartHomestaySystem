const reviewService = require('../services/reviewService');
const notificationService = require('../services/notificationService');
const Booking = require('../models/Booking');
const Homestay = require('../models/Homestay');

class ReviewController {
  // Tạo đánh giá mới
  async createReview(req, res) {
    try {
      const userId = req.userId;
      const reviewData = {
        bookingId: req.body.bookingId,
        rating: req.body.rating,
        comment: req.body.comment,
        images: req.body.images || [],
        videos: req.body.videos || [],
        details: req.body.details || {},
        isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true
      };

      // Validation
      if (!reviewData.bookingId) {
        return res.status(400).json({
          success: false,
          message: 'Booking ID là bắt buộc'
        });
      }

      if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Đánh giá phải từ 1 đến 5 sao'
        });
      }

      const review = await reviewService.createReview(reviewData, userId);

      // Tạo notification cho host khi có review mới
      try {
        const booking = await Booking.findById(reviewData.bookingId).populate('homestay', 'host');
        if (booking && booking.homestay) {
          const hostId = typeof booking.homestay.host === 'object' 
            ? booking.homestay.host._id 
            : booking.homestay.host;
          const homestayId = typeof booking.homestay === 'object' 
            ? booking.homestay._id 
            : booking.homestay;
          
          const reviewId = review._id || review.id || (typeof review === 'string' ? review : null);
          if (reviewId && hostId && homestayId) {
            await notificationService.notifyNewReview(
              reviewId.toString(),
              homestayId.toString(),
              hostId.toString()
            );
          }
        }
      } catch (notifError) {
        console.error('Error creating review notification:', notifError);
        // Không throw error, chỉ log
      }

      res.status(201).json({
        success: true,
        message: 'Đánh giá đã được tạo thành công',
        data: review
      });
    } catch (error) {
      console.error('Error in createReview:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể tạo đánh giá'
      });
    }
  }

  // Cập nhật đánh giá
  async updateReview(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const reviewData = {
        rating: req.body.rating,
        comment: req.body.comment,
        images: req.body.images,
        videos: req.body.videos,
        details: req.body.details,
        isPublic: req.body.isPublic
      };

      // Xóa các trường undefined
      Object.keys(reviewData).forEach(key => {
        if (reviewData[key] === undefined) {
          delete reviewData[key];
        }
      });

      if (reviewData.rating && (reviewData.rating < 1 || reviewData.rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'Đánh giá phải từ 1 đến 5 sao'
        });
      }

      const review = await reviewService.updateReview(id, reviewData, userId);

      res.json({
        success: true,
        message: 'Đánh giá đã được cập nhật',
        data: review
      });
    } catch (error) {
      console.error('Error in updateReview:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể cập nhật đánh giá'
      });
    }
  }

  // Lấy đánh giá theo ID
  async getReviewById(req, res) {
    try {
      const { id } = req.params;
      const review = await reviewService.getReviewById(id);

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      console.error('Error in getReviewById:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy đánh giá'
      });
    }
  }

  // Lấy đánh giá theo booking ID
  async getReviewByBookingId(req, res) {
    try {
      const { bookingId } = req.params;
      const review = await reviewService.getReviewByBookingId(bookingId);

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      console.error('Error in getReviewByBookingId:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy đánh giá'
      });
    }
  }

  // Lấy danh sách đánh giá của homestay
  async getHomestayReviews(req, res) {
    try {
      const { homestayId } = req.params;
      const params = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        rating: req.query.rating || null,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await reviewService.getHomestayReviews(homestayId, params);

      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getHomestayReviews:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách đánh giá'
      });
    }
  }

  // Lấy danh sách đánh giá của user
  async getUserReviews(req, res) {
    try {
      const userId = req.userId;
      const params = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await reviewService.getUserReviews(userId, params);

      res.json({
        success: true,
        data: result.reviews,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getUserReviews:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách đánh giá'
      });
    }
  }

  // Xóa đánh giá
  async deleteReview(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      await reviewService.deleteReview(id, userId);

      res.json({
        success: true,
        message: 'Đánh giá đã được xóa'
      });
    } catch (error) {
      console.error('Error in deleteReview:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể xóa đánh giá'
      });
    }
  }

  // Host phản hồi đánh giá
  async addHostResponse(req, res) {
    try {
      const hostId = req.userId;
      const { id } = req.params;
      const { response } = req.body;

      if (!response || !response.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung phản hồi là bắt buộc'
        });
      }

      const review = await reviewService.addHostResponse(id, response.trim(), hostId);

      res.json({
        success: true,
        message: 'Phản hồi đã được thêm',
        data: review
      });
    } catch (error) {
      console.error('Error in addHostResponse:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể thêm phản hồi'
      });
    }
  }
}

module.exports = new ReviewController();

