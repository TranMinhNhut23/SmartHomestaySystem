const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên mã giảm giá là bắt buộc'],
    trim: true,
    maxlength: [200, 'Tên mã giảm giá không được vượt quá 200 ký tự']
  },
  code: {
    type: String,
    required: [true, 'Mã giảm giá là bắt buộc'],
    trim: true,
    uppercase: true,
    unique: true,
    maxlength: [50, 'Mã giảm giá không được vượt quá 50 ký tự']
  },
  discountType: {
    type: String,
    enum: ['percent', 'fixed'],
    required: [true, 'Loại giảm giá là bắt buộc']
  },
  discountValue: {
    type: Number,
    required: [true, 'Giá trị giảm giá là bắt buộc'],
    min: [0, 'Giá trị giảm giá phải lớn hơn hoặc bằng 0']
  },
  maxDiscount: {
    type: Number,
    default: null,
    min: [0, 'Giảm giá tối đa phải lớn hơn hoặc bằng 0']
  },
  minOrder: {
    type: Number,
    default: null,
    min: [0, 'Đơn hàng tối thiểu phải lớn hơn hoặc bằng 0']
  },
  maxUsagePerUser: {
    type: Number,
    default: null,
    min: [1, 'Số lần sử dụng tối đa mỗi user phải lớn hơn 0']
  },
  maxUsageTotal: {
    type: Number,
    default: null,
    min: [1, 'Tổng số lần sử dụng tối đa phải lớn hơn 0']
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Số lần đã sử dụng phải lớn hơn hoặc bằng 0']
  },
  startDate: {
    type: Date,
    required: [true, 'Ngày bắt đầu là bắt buộc']
  },
  endDate: {
    type: Date,
    required: [true, 'Ngày kết thúc là bắt buộc']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  // Phạm vi áp dụng: admin tạo -> all; host tạo -> host
  appliesTo: {
    type: String,
    enum: ['all', 'host'],
    default: 'all'
  },
  // Khi appliesTo = 'host', chỉ áp dụng cho các homestay thuộc host này
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người tạo là bắt buộc']
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
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ status: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });
couponSchema.index({ creatorId: 1 });
couponSchema.index({ appliesTo: 1 });
couponSchema.index({ hostId: 1 });

// Validate endDate phải sau startDate
couponSchema.pre('validate', function(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'Ngày kết thúc phải sau ngày bắt đầu');
  }
  next();
});

// Validate discountValue
couponSchema.pre('validate', function(next) {
  if (this.discountType === 'percent' && this.discountValue > 100) {
    this.invalidate('discountValue', 'Giảm giá phần trăm không được vượt quá 100%');
  }
  next();
});

// Tự động set hostId từ creatorId nếu appliesTo === 'host' và hostId null
couponSchema.pre('save', function(next) {
  // Nếu appliesTo là 'host' và hostId là null, set hostId = creatorId
  if (this.appliesTo === 'host' && !this.hostId && this.creatorId) {
    this.hostId = this.creatorId;
    console.log(`Auto-setting hostId for coupon ${this.code}: ${this.creatorId}`);
  }
  // Nếu appliesTo là 'all', đảm bảo hostId là null
  if (this.appliesTo === 'all' && this.hostId) {
    this.hostId = null;
  }
  next();
});

// Method để fix coupon cũ (nếu appliesTo === 'host' nhưng hostId null)
couponSchema.methods.fixHostId = async function() {
  if (this.appliesTo === 'host' && !this.hostId && this.creatorId) {
    this.hostId = this.creatorId;
    await this.save();
    console.log(`Fixed hostId for coupon ${this.code}: set to ${this.creatorId}`);
  }
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;

