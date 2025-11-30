const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User là bắt buộc'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Loại thông báo là bắt buộc'],
    enum: [
      // User notifications
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_completed',
      'payment_success',
      'payment_failed',
      'review_posted',
      // Host notifications
      'new_booking_request',
      'booking_payment_received',
      'host_received_payment',
      'homestay_approved',
      'homestay_rejected',
      'homestay_pending_review',
      'new_review',
      // Admin notifications
      'homestay_submitted',
      'host_request_approved',
      'host_request_rejected',
      'system_announcement',
      // Wallet notifications
      'wallet_deposit',
      'wallet_withdraw',
      'wallet_transaction',
      // Refund notifications
      'refund_processed',
      'refund_request_submitted',
      // Maintenance fee notifications
      'maintenance_fee_charged',
      'maintenance_fee_failed'
    ]
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
  },
  message: {
    type: String,
    required: [true, 'Nội dung là bắt buộc'],
    trim: true,
    maxlength: [1000, 'Nội dung không được vượt quá 1000 ký tự']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Lưu thông tin bổ sung như bookingId, homestayId, etc.
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'host', 'admin'],
    default: 'user',
    index: true
    // Lưu role để filter dễ dàng
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index để query nhanh
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, role: 1, createdAt: -1 });

// Static method để tạo notification
notificationSchema.statics.createNotification = async function(notificationData) {
  const notification = new this(notificationData);
  return await notification.save();
};

// Method để đánh dấu đã đọc
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

