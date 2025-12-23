const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Homestay = require('../models/Homestay');
const uploadService = require('./uploadService');

class ReviewService {
  // Tạo đánh giá mới
  async createReview(reviewData, guestId) {
    try {
      // Kiểm tra booking có tồn tại không
      const booking = await Booking.findById(reviewData.bookingId)
        .populate('homestay', 'host');

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra booking có thuộc về guest không
      if (booking.guest.toString() !== guestId.toString()) {
        throw new Error('Bạn không có quyền đánh giá booking này');
      }

      // Kiểm tra booking đã completed chưa
      if (booking.status !== 'completed') {
        throw new Error('Chỉ có thể đánh giá khi booking đã hoàn thành');
      }

      // Kiểm tra đã đánh giá chưa
      const existingReview = await Review.findOne({ booking: reviewData.bookingId });
      if (existingReview) {
        throw new Error('Bạn đã đánh giá booking này rồi');
      }

      // Xử lý upload images nếu có
      let savedImages = [];
      if (reviewData.images && Array.isArray(reviewData.images) && reviewData.images.length > 0) {
        try {
          // Kiểm tra xem ảnh có phải base64 mới không (cần lưu lại)
          const newBase64Images = reviewData.images.filter(img => 
            img && img.startsWith('data:image')
          );
          const existingUrls = reviewData.images.filter(img => 
            img && !img.startsWith('data:image') && !img.startsWith('http')
          );
          
          savedImages = [...existingUrls];
          
          if (newBase64Images.length > 0) {
            const uploadedImages = await uploadService.saveMultipleReviewImages(newBase64Images, guestId);
            savedImages = [...savedImages, ...uploadedImages];
          }
        } catch (error) {
          console.error('Error saving review images:', error);
          throw new Error('Không thể lưu ảnh: ' + error.message);
        }
      }

      // Tạo review
      const review = new Review({
        booking: reviewData.bookingId,
        homestay: booking.homestay._id,
        guest: guestId,
        rating: reviewData.rating,
        comment: reviewData.comment || '',
        images: savedImages,
        videos: reviewData.videos || [],
        details: reviewData.details || {},
        isPublic: reviewData.isPublic !== undefined ? reviewData.isPublic : true,
        isVerified: true // Tự động verify vì booking đã completed
      });

      await review.save();

      // Populate thông tin
      await review.populate([
        { path: 'guest', select: 'username avatar' },
        { path: 'booking', select: 'checkIn checkOut numberOfGuests' },
        { path: 'homestay', select: 'name address' }
      ]);

      return review.toObject();
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Cập nhật đánh giá
  async updateReview(reviewId, reviewData, userId) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Đánh giá không tồn tại');
      }

      // Chỉ guest có thể cập nhật review của mình
      if (review.guest.toString() !== userId.toString()) {
        throw new Error('Bạn không có quyền cập nhật đánh giá này');
      }

      // Cập nhật các trường được phép
      if (reviewData.rating !== undefined) review.rating = reviewData.rating;
      if (reviewData.comment !== undefined) review.comment = reviewData.comment;
      if (reviewData.videos !== undefined) review.videos = reviewData.videos;
      if (reviewData.details !== undefined) review.details = reviewData.details;
      if (reviewData.isPublic !== undefined) review.isPublic = reviewData.isPublic;
      
      // Xử lý upload images nếu có
      if (reviewData.images !== undefined && Array.isArray(reviewData.images)) {
        try {
          // Kiểm tra xem ảnh có phải base64 mới không (cần lưu lại)
          const newBase64Images = reviewData.images.filter(img => 
            img && img.startsWith('data:image')
          );
          const existingUrls = reviewData.images.filter(img => 
            img && !img.startsWith('data:image') && !img.startsWith('http')
          );
          
          let savedImages = [...existingUrls];
          
          if (newBase64Images.length > 0) {
            const uploadedImages = await uploadService.saveMultipleReviewImages(newBase64Images, userId);
            savedImages = [...savedImages, ...uploadedImages];
          }
          
          review.images = savedImages;
        } catch (error) {
          console.error('Error saving review images:', error);
          throw new Error('Không thể lưu ảnh: ' + error.message);
        }
      }

      await review.save();

      // Populate thông tin
      await review.populate([
        { path: 'guest', select: 'username avatar' },
        { path: 'booking', select: 'checkIn checkOut numberOfGuests' },
        { path: 'homestay', select: 'name address' }
      ]);

      return review.toObject();
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  // Lấy đánh giá theo ID
  async getReviewById(reviewId) {
    try {
      const review = await Review.findById(reviewId)
        .populate('guest', 'username avatar')
        .populate('booking', 'checkIn checkOut numberOfGuests')
        .populate('homestay', 'name address images');

      if (!review) {
        throw new Error('Đánh giá không tồn tại');
      }

      return review.toObject();
    } catch (error) {
      console.error('Error getting review:', error);
      throw error;
    }
  }

  // Lấy đánh giá theo booking ID
  async getReviewByBookingId(bookingId) {
    try {
      const review = await Review.findOne({ booking: bookingId })
        .populate('guest', 'username avatar')
        .populate('booking', 'checkIn checkOut numberOfGuests')
        .populate('homestay', 'name address images');

      return review ? review.toObject() : null;
    } catch (error) {
      console.error('Error getting review by booking:', error);
      throw error;
    }
  }

  // Lấy danh sách đánh giá của homestay
  async getHomestayReviews(homestayId, params = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        rating = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      const query = {
        homestay: homestayId,
        isPublic: true
      };

      if (rating) {
        query.rating = parseInt(rating);
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const reviews = await Review.find(query)
        .populate('guest', 'username avatar')
        .populate('booking', 'checkIn checkOut numberOfGuests')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments(query);

      return {
        reviews: reviews.map(r => r.toObject()),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting homestay reviews:', error);
      throw error;
    }
  }

  // Lấy danh sách đánh giá của user
  async getUserReviews(userId, params = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      const query = {
        guest: userId
      };

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const reviews = await Review.find(query)
        .populate('homestay', 'name address images')
        .populate('booking', 'checkIn checkOut numberOfGuests')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments(query);

      return {
        reviews: reviews.map(r => r.toObject()),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user reviews:', error);
      throw error;
    }
  }

  // Xóa đánh giá
  async deleteReview(reviewId, userId) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw new Error('Đánh giá không tồn tại');
      }

      // Chỉ guest có thể xóa review của mình
      if (review.guest.toString() !== userId.toString()) {
        throw new Error('Bạn không có quyền xóa đánh giá này');
      }

      const homestayId = review.homestay;
      await review.remove();

      // Cập nhật lại rating của homestay
      await Review.updateHomestayRating(homestayId);

      return { success: true };
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  // Host phản hồi đánh giá
  async addHostResponse(reviewId, responseText, hostId) {
    try {
      const review = await Review.findById(reviewId)
        .populate('homestay', 'host');

      if (!review) {
        throw new Error('Đánh giá không tồn tại');
      }

      // Kiểm tra host có quyền không
      if (review.homestay.host.toString() !== hostId.toString()) {
        throw new Error('Bạn không có quyền phản hồi đánh giá này');
      }

      review.hostResponse = {
        comment: responseText,
        respondedAt: new Date()
      };

      await review.save();

      await review.populate([
        { path: 'guest', select: 'username avatar' },
        { path: 'booking', select: 'checkIn checkOut numberOfGuests' },
        { path: 'homestay', select: 'name address' }
      ]);

      return review.toObject();
    } catch (error) {
      console.error('Error adding host response:', error);
      throw error;
    }
  }

  // Lấy tất cả reviews của các homestay mà host sở hữu
  async getHostReviews(hostId, params = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        rating = null,
        hasResponse = null, // null: tất cả, true: đã reply, false: chưa reply
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;

      // Lấy tất cả homestay của host
      const homestays = await Homestay.find({ host: hostId }).select('_id');
      const homestayIds = homestays.map(h => h._id);

      if (homestayIds.length === 0) {
        return {
          reviews: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }

      const query = {
        homestay: { $in: homestayIds }
      };

      if (rating) {
        query.rating = parseInt(rating);
      }

      // Filter theo có response hay chưa
      if (hasResponse === true) {
        query['hostResponse.comment'] = { $exists: true, $ne: null };
      } else if (hasResponse === false) {
        query.$or = [
          { 'hostResponse.comment': { $exists: false } },
          { 'hostResponse.comment': null }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const reviews = await Review.find(query)
        .populate('guest', 'username avatar email')
        .populate('booking', 'checkIn checkOut numberOfGuests')
        .populate('homestay', 'name address images')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Review.countDocuments(query);

      return {
        reviews: reviews.map(r => r.toObject()),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting host reviews:', error);
      throw error;
    }
  }
}

module.exports = new ReviewService();

