const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User là bắt buộc'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Loại khiếu nại là bắt buộc'],
    enum: [
      'homestay',           // Khiếu nại về homestay
      'booking',            // Khiếu nại về đặt phòng
      'payment',            // Khiếu nại về thanh toán
      'service',            // Khiếu nại về dịch vụ
      'host',               // Khiếu nại về chủ nhà
      'other'               // Khiếu nại khác
    ],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Tiêu đề là bắt buộc'],
    trim: true,
    minlength: [5, 'Tiêu đề phải có ít nhất 5 ký tự'],
    maxlength: [200, 'Tiêu đề không được vượt quá 200 ký tự']
  },
  content: {
    type: String,
    required: [true, 'Nội dung khiếu nại là bắt buộc'],
    trim: true,
    minlength: [10, 'Nội dung phải có ít nhất 10 ký tự'],
    maxlength: [2000, 'Nội dung không được vượt quá 2000 ký tự']
  },
  // Liên kết với các entity khác (tùy chọn)
  relatedEntity: {
    type: {
      entityType: {
        type: String,
        enum: ['homestay', 'booking', 'host', 'user'],
        default: null
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      }
    },
    default: null
  },
  // Trạng thái xử lý
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  // Phản hồi từ admin
  adminResponse: {
    type: {
      response: {
        type: String,
        trim: true,
        maxlength: [1000, 'Phản hồi không được vượt quá 1000 ký tự']
      },
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      respondedAt: {
        type: Date
      }
    },
    default: null
  },
  // Đánh giá từ user về việc xử lý
  userFeedback: {
    type: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Bình luận không được vượt quá 500 ký tự']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    },
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  attachments: {
    type: [String],
    default: []
    // URLs của ảnh/file đính kèm
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index để query nhanh
complaintSchema.index({ user: 1, status: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1, createdAt: -1 });
complaintSchema.index({ type: 1, status: 1 });

// Method để cập nhật trạng thái
complaintSchema.methods.updateStatus = async function(status, adminId, response = null) {
  this.status = status;
  if (response && adminId) {
    this.adminResponse = {
      response,
      respondedBy: adminId,
      respondedAt: new Date()
    };
  }
  this.updatedAt = new Date();
  return await this.save();
};

// Method để thêm phản hồi từ user
complaintSchema.methods.addUserFeedback = async function(rating, comment = null) {
  this.userFeedback = {
    rating,
    comment: comment || null,
    createdAt: new Date()
  };
  return await this.save();
};

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;








