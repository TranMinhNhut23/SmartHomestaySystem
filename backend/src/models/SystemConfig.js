const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // Cấu hình trang chủ
  homepage: {
    // Hình ảnh quảng cáo ở đầu trang
    bannerImages: [{
      id: {
        type: String,
        required: true
      },
      image: {
        type: String,
        required: true
      },
      title: {
        type: String,
        default: ''
      },
      link: {
        type: String,
        default: null
      },
      order: {
        type: Number,
        default: 0
      },
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    // Cấu hình sự kiện sale
    saleEvents: [{
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        default: ''
      },
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    // Cấu hình categories
    categories: [{
      id: {
        type: String,
        required: true
      },
      label: {
        type: String,
        required: true
      },
      icon: {
        type: String,
        required: true
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }]
  },
  // Các cấu hình khác có thể thêm sau
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Chỉ cho phép 1 document duy nhất
systemConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    // Tạo config mặc định
    config = await this.create({
      homepage: {
        bannerImages: [
          {
            id: '1',
            image: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=800',
            title: 'Khuyến mãi đặc biệt',
            order: 0,
            isActive: true
          },
          {
            id: '2',
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
            title: 'Đặt phòng ngay hôm nay',
            order: 1,
            isActive: true
          },
          {
            id: '3',
            image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
            title: 'Ưu đãi hấp dẫn',
            order: 2,
            isActive: true
          }
        ],
        saleEvents: [],
        categories: [
          { id: 'sale', label: 'Black Friday Sale', icon: 'flash', isActive: true, order: 0 },
          { id: 'flights', label: 'Tìm chuyến bay', icon: 'airplane', isActive: true, order: 1 },
          { id: 'hotels', label: 'Tìm khách sạn', icon: 'bed', isActive: true, order: 2 },
          { id: 'activities', label: 'Hoạt động du lịch', icon: 'bicycle', isActive: true, order: 3 },
          { id: 'bus', label: 'Vé xe khách', icon: 'bus', isActive: true, order: 4 }
        ]
      }
    });
  }
  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
