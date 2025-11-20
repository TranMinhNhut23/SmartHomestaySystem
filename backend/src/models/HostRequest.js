const mongoose = require('mongoose');

const hostRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID là bắt buộc'],
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Họ và tên là bắt buộc'],
    trim: true,
    maxlength: [100, 'Họ và tên không được vượt quá 100 ký tự']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Ngày sinh là bắt buộc']
  },
  address: {
    type: String,
    required: [true, 'Địa chỉ là bắt buộc'],
    trim: true,
    maxlength: [500, 'Địa chỉ không được vượt quá 500 ký tự']
  },
  idCardFront: {
    type: String,
    required: [true, 'Ảnh mặt trước CCCD là bắt buộc'],
    maxlength: [10000000, 'Ảnh quá lớn'] // ~10MB base64
  },
  idCardBack: {
    type: String,
    required: [true, 'Ảnh mặt sau CCCD là bắt buộc'],
    maxlength: [10000000, 'Ảnh quá lớn'] // ~10MB base64
  },
  reason: {
    type: String,
    required: [true, 'Lý do trở thành host là bắt buộc'],
    trim: true,
    maxlength: [2000, 'Lý do không được vượt quá 2000 ký tự']
  },
  homestayProof: {
    type: String,
    required: [true, 'Chứng minh có homestay là bắt buộc'],
    trim: true,
    maxlength: [2000, 'Chứng minh không được vượt quá 2000 ký tự']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  termsAccepted: {
    type: Boolean,
    required: [true, 'Phải đồng ý với điều khoản'],
    default: false
  },
  rejectedReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Lý do từ chối không được vượt quá 1000 ký tự']
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index để tìm nhanh request của user
hostRequestSchema.index({ userId: 1, status: 1 });
hostRequestSchema.index({ status: 1, createdAt: -1 });

const HostRequest = mongoose.model('HostRequest', hostRequestSchema);

module.exports = HostRequest;





