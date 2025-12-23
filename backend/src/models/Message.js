const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat là bắt buộc']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Người gửi là bắt buộc']
  },
  content: {
    type: String,
    required: [true, 'Nội dung tin nhắn là bắt buộc'],
    trim: true,
    maxlength: [5000, 'Tin nhắn không được vượt quá 5000 ký tự']
  },
  // Loại tin nhắn: text, image, file, system
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  // Trạng thái: sent, delivered, read
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  // Đã đọc bởi ai
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });

// Method để đánh dấu đã đọc
messageSchema.methods.markAsRead = async function(userId) {
  // Kiểm tra xem user đã đọc chưa
  const alreadyRead = this.readBy.some(
    read => read.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    this.status = 'read';
    await this.save();
  }
};

// Static method để đánh dấu tất cả tin nhắn trong chat là đã đọc
messageSchema.statics.markAllAsRead = async function(chatId, userId) {
  await this.updateMany(
    {
      chat: chatId,
      sender: { $ne: userId }, // Không phải tin nhắn của chính user
      'readBy.user': { $ne: userId } // Chưa được đọc bởi user này
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      },
      $set: {
        status: 'read'
      }
    }
  );
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
































