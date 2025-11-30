const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  homestay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homestay',
    required: [true, 'Homestay là bắt buộc']
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Phòng là bắt buộc']
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Khách hàng là bắt buộc']
  },
  checkIn: {
    type: Date,
    required: [true, 'Ngày nhận phòng là bắt buộc']
  },
  checkOut: {
    type: Date,
    required: [true, 'Ngày trả phòng là bắt buộc']
  },
  numberOfGuests: {
    type: Number,
    required: [true, 'Số lượng khách là bắt buộc'],
    min: [1, 'Số lượng khách phải lớn hơn 0']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Tổng giá là bắt buộc'],
    min: [0, 'Tổng giá phải lớn hơn hoặc bằng 0']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['momo', 'vnpay', 'cash', 'wallet'],
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partial_refunded'],
    default: 'pending'
  },
  paymentTransactionId: {
    type: String,
    trim: true,
    default: null
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Số tiền giảm giá phải lớn hơn hoặc bằng 0']
  },
  originalPrice: {
    type: Number,
    default: null
  },
  guestInfo: {
    fullName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [1000, 'Yêu cầu đặc biệt không được vượt quá 1000 ký tự']
    }
  },
  // Thông tin hoàn tiền
  refund: {
    status: {
      type: String,
      enum: ['none', 'pending', 'completed', 'rejected'],
      default: 'none'
    },
    amount: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      trim: true
    },
    processedAt: {
      type: Date,
      default: null
    },
    transactionId: {
      type: String,
      default: null
    }
  },
  // Yêu cầu hoàn tiền từ user
  refundRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    requestedAt: {
      type: Date,
      default: null
    },
    requestReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Lý do không được vượt quá 1000 ký tự']
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    adminNote: {
      type: String,
      trim: true,
      default: null
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  cancelledBy: {
    type: String,
    enum: ['guest', 'host', 'system'],
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
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
bookingSchema.index({ guest: 1 });
bookingSchema.index({ homestay: 1 });
bookingSchema.index({ room: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });

// Method để tính số đêm
bookingSchema.methods.getNumberOfNights = function() {
  const diffTime = Math.abs(this.checkOut - this.checkIn);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Method để tính % hoàn tiền khi hủy đơn
bookingSchema.methods.calculateRefundPercentage = function(cancelledBy) {
  // Nếu chủ nhà hủy → hoàn 100%
  if (cancelledBy === 'host' || cancelledBy === 'system') {
    return 100;
  }

  // Nếu khách hủy, tính dựa vào thời gian
  const now = new Date();
  const checkInDate = new Date(this.checkIn);
  const diffTime = checkInDate - now;
  const daysUntilCheckIn = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Quy tắc hoàn tiền mới:
  // Hủy trước >= 7 ngày: hoàn 100%
  if (daysUntilCheckIn >= 7) {
    return 100;
  }
  // Hủy 3-6 ngày trước: hoàn 50%
  else if (daysUntilCheckIn >= 3) {
    return 50;
  }
  // Hủy 1-2 ngày trước: hoàn 25%
  else if (daysUntilCheckIn >= 1) {
    return 25;
  }
  // Hủy < 1 ngày hoặc sau check-in: không hoàn
  else {
    return 0;
  }
};

// Method để kiểm tra booking có conflict không
bookingSchema.statics.hasConflict = async function(roomId, checkIn, checkOut, excludeBookingId = null) {
  const query = {
    room: roomId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn }
      }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflict = await this.findOne(query);
  return !!conflict;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;


