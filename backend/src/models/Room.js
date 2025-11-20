const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  homestay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homestay',
    required: [true, 'Homestay là bắt buộc']
  },
  type: {
    type: String,
    required: [true, 'Loại phòng là bắt buộc'],
    enum: ['single', 'double', 'twin', 'triple', 'standard', 'deluxe'],
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Tên phòng là bắt buộc'],
    trim: true,
    minlength: [1, 'Tên phòng phải có ít nhất 1 ký tự'],
    maxlength: [100, 'Tên phòng không được vượt quá 100 ký tự']
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Giá mỗi đêm là bắt buộc'],
    min: [0, 'Giá mỗi đêm phải lớn hơn hoặc bằng 0']
  },
  maxGuests: {
    type: Number,
    required: [true, 'Số khách tối đa là bắt buộc'],
    min: [1, 'Số khách tối đa phải lớn hơn hoặc bằng 1'],
    max: [10, 'Số khách tối đa không được vượt quá 10']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'unavailable'],
    default: 'available'
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
roomSchema.index({ homestay: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ status: 1 });

// Method để lấy số khách mặc định theo loại phòng
roomSchema.statics.getDefaultMaxGuests = function(roomType) {
  const defaultGuests = {
    single: 1,
    double: 2,
    twin: 2,
    triple: 3,
    standard: 2,
    deluxe: 2
  };
  return defaultGuests[roomType?.toLowerCase()] || 2;
};

// Method để lấy mô tả loại phòng
roomSchema.methods.getTypeDescription = function() {
  const descriptions = {
    single: 'Phòng đơn dành cho 1 người, thường có 1 giường đơn.',
    double: 'Phòng đôi dành cho 2 người, có 1 giường đôi hoặc 2 giường đơn.',
    twin: 'Phòng có 2 giường đơn, phù hợp cho 2 người.',
    triple: 'Phòng dành cho 3 người với 3 giường hoặc 1 giường đôi + 1 đơn.',
    standard: 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản.',
    deluxe: 'Phòng cao cấp với không gian rộng rãi và tiện nghi nâng cao.'
  };
  return descriptions[this.type] || '';
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;



