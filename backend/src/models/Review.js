const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking là bắt buộc'],
    unique: true // Mỗi booking chỉ có thể đánh giá 1 lần
  },
  homestay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homestay',
    required: [true, 'Homestay là bắt buộc']
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Khách hàng là bắt buộc']
  },
  rating: {
    type: Number,
    required: [true, 'Đánh giá là bắt buộc'],
    min: [1, 'Đánh giá tối thiểu là 1 sao'],
    max: [5, 'Đánh giá tối đa là 5 sao']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [2000, 'Nhận xét không được vượt quá 2000 ký tự']
  },
  images: [{
    type: String, // URL của hình ảnh
    trim: true
  }],
  videos: [{
    type: String, // URL của video
    trim: true
  }],
  // Đánh giá chi tiết theo từng tiêu chí (optional)
  details: {
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    location: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    },
    service: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  // Đánh giá của host về guest (optional)
  hostResponse: {
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Phản hồi không được vượt quá 1000 ký tự']
    },
    respondedAt: {
      type: Date
    }
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false // Đánh giá đã được xác minh (đã hoàn thành booking)
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
reviewSchema.index({ homestay: 1, createdAt: -1 });
reviewSchema.index({ guest: 1 });
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isPublic: 1 });

// Virtual để tính rating trung bình chi tiết
reviewSchema.virtual('averageDetailRating').get(function() {
  if (!this.details || !this.details.cleanliness) return this.rating;
  
  const { cleanliness, location, value, service } = this.details;
  const count = [cleanliness, location, value, service].filter(v => v !== undefined).length;
  
  if (count === 0) return this.rating;
  
  const sum = (cleanliness || 0) + (location || 0) + (value || 0) + (service || 0);
  return (sum / count).toFixed(1);
});

// Method để cập nhật average rating của homestay
reviewSchema.statics.updateHomestayRating = async function(homestayId) {
  const reviews = await this.find({ 
    homestay: homestayId, 
    isPublic: true 
  });
  
  if (reviews.length === 0) {
    const Homestay = mongoose.model('Homestay');
    await Homestay.findByIdAndUpdate(homestayId, {
      $unset: { 
        averageRating: 1,
        reviewCount: 1
      }
    });
    return;
  }
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = (totalRating / reviews.length).toFixed(1);
  
  const Homestay = mongoose.model('Homestay');
  await Homestay.findByIdAndUpdate(homestayId, {
    averageRating: parseFloat(averageRating),
    reviewCount: reviews.length
  });
};

// Pre-save hook để tự động verify nếu booking đã completed
reviewSchema.pre('save', async function(next) {
  if (this.isNew && this.booking) {
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(this.booking);
    
    if (booking && booking.status === 'completed') {
      this.isVerified = true;
    }
    
    // Đảm bảo guest trùng với booking guest
    if (booking && booking.guest.toString() !== this.guest.toString()) {
      return next(new Error('Bạn không có quyền đánh giá booking này'));
    }
  }
  
  next();
});

// Post-save hook để cập nhật rating của homestay
reviewSchema.post('save', async function() {
  if (this.isPublic) {
    await this.constructor.updateHomestayRating(this.homestay);
  }
});

// Post-remove hook để cập nhật rating của homestay khi xóa review
reviewSchema.post('remove', async function() {
  await this.constructor.updateHomestayRating(this.homestay);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;






















