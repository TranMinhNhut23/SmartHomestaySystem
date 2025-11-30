const mongoose = require('mongoose');

const homestaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên homestay là bắt buộc'],
    trim: true,
    minlength: [3, 'Tên homestay phải có ít nhất 3 ký tự'],
    maxlength: [200, 'Tên homestay không được vượt quá 200 ký tự']
  },
  description: {
    type: String,
    required: [true, 'Mô tả là bắt buộc'],
    trim: true,
    maxlength: [5000, 'Mô tả không được vượt quá 5000 ký tự']
  },
  address: {
    province: {
      code: {
        type: String,
        required: [true, 'Mã tỉnh/thành là bắt buộc']
      },
      name: {
        type: String,
        required: [true, 'Tên tỉnh/thành là bắt buộc']
      }
    },
    district: {
      code: {
        type: String,
        required: [true, 'Mã quận/huyện là bắt buộc']
      },
      name: {
        type: String,
        required: [true, 'Tên quận/huyện là bắt buộc']
      }
    },
    ward: {
      code: {
        type: String,
        required: [true, 'Mã phường/xã là bắt buộc']
      },
      name: {
        type: String,
        required: [true, 'Tên phường/xã là bắt buộc']
      }
    },
    street: {
      type: String,
      required: [true, 'Số nhà, tên đường là bắt buộc'],
      trim: true,
      maxlength: [200, 'Địa chỉ đường không được vượt quá 200 ký tự']
    }
  },
  googleMapsEmbed: {
    type: String,
    trim: true,
    maxlength: [2000, 'Mã nhúng Google Maps quá dài']
  },
  pricePerNight: {
    type: Number,
    required: false, // Không bắt buộc nữa vì giá sẽ lưu ở từng phòng
    min: [0, 'Giá mỗi đêm phải lớn hơn hoặc bằng 0']
  },
  images: [{
    type: String,
    required: true
  }],
  amenities: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  requireDeposit: {
    type: Boolean,
    default: false
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Chủ nhà là bắt buộc']
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'rejected'],
    default: 'pending'
  },
  averageRating: {
    type: Number,
    min: [0, 'Đánh giá trung bình phải lớn hơn hoặc bằng 0'],
    max: [5, 'Đánh giá trung bình không được vượt quá 5'],
    default: null
  },
  reviewCount: {
    type: Number,
    min: [0, 'Số lượng đánh giá phải lớn hơn hoặc bằng 0'],
    default: 0
  },
  rejectedReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Lý do từ chối không được vượt quá 1000 ký tự']
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
homestaySchema.index({ host: 1 });
homestaySchema.index({ status: 1 });
homestaySchema.index({ featured: 1 });
homestaySchema.index({ 'address.province.code': 1 });
homestaySchema.index({ 'address.district.code': 1 });
homestaySchema.index({ amenities: 1 });

// Method để lấy địa chỉ đầy đủ
homestaySchema.methods.getFullAddress = function() {
  const { street, ward, district, province } = this.address;
  return `${street}, ${ward.name}, ${district.name}, ${province.name}`;
};

// Method để kiểm tra homestay có thuộc về host không
homestaySchema.methods.isOwnedBy = function(userId) {
  return this.host.toString() === userId.toString();
};

const Homestay = mongoose.model('Homestay', homestaySchema);

module.exports = Homestay;


