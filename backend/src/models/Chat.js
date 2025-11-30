const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // User và Host của homestay (có thể null nếu là chat với admin)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Admin trong chat (nếu có)
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Homestay liên quan đến chat này (có thể null nếu là chat với admin)
  homestay: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Homestay',
    default: null
  },
  // Loại chat: 'user-host', 'user-admin', 'host-admin'
  chatType: {
    type: String,
    enum: ['user-host', 'user-admin', 'host-admin'],
    required: true
  },
  // Tin nhắn cuối cùng để hiển thị preview
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: null
  },
  // Đếm số tin nhắn chưa đọc cho mỗi user
  unreadCount: {
    user: {
      type: Number,
      default: 0
    },
    host: {
      type: Number,
      default: 0
    },
    admin: {
      type: Number,
      default: 0
    }
  },
  // Trạng thái chat
  isActive: {
    type: Boolean,
    default: true
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
chatSchema.index({ user: 1, host: 1, homestay: 1 });
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ isActive: 1 });
chatSchema.index({ chatType: 1 });

// Method để lấy participant còn lại (không phải currentUser)
chatSchema.methods.getOtherParticipant = function(currentUserId) {
  return this.participants.find(p => p.toString() !== currentUserId.toString());
};

// Static method để tìm hoặc tạo chat giữa user và host cho homestay
chatSchema.statics.findOrCreateChat = async function(userId, hostId, homestayId) {
  // Tìm chat đã tồn tại
  let chat = await this.findOne({
    user: userId,
    host: hostId,
    homestay: homestayId,
    chatType: 'user-host',
    isActive: true
  }).populate('participants', 'username email avatar');

  // Nếu chưa có, tạo mới
  if (!chat) {
    chat = new this({
      participants: [userId, hostId],
      user: userId,
      host: hostId,
      homestay: homestayId,
      chatType: 'user-host',
      isActive: true
    });
    await chat.save();
    await chat.populate('participants', 'username email avatar');
  }

  return chat;
};

// Static method để tìm hoặc tạo chat với admin
chatSchema.statics.findOrCreateAdminChat = async function(userId, adminId, chatType, homestayId = null) {
  // Validate chatType
  if (!['user-admin', 'host-admin'].includes(chatType)) {
    throw new Error('Invalid chatType for admin chat');
  }

  // Tìm chat đã tồn tại
  const query = {
    participants: { $all: [userId, adminId] },
    chatType: chatType,
    isActive: true
  };

  if (chatType === 'user-admin') {
    query.user = userId;
    query.admin = adminId;
  } else if (chatType === 'host-admin') {
    query.host = userId;
    query.admin = adminId;
  }

  if (homestayId) {
    query.homestay = homestayId;
  }

  let chat = await this.findOne(query).populate('participants', 'username email avatar');

  // Nếu chưa có, tạo mới
  if (!chat) {
    const chatData = {
      participants: [userId, adminId],
      chatType: chatType,
      isActive: true
    };

    if (chatType === 'user-admin') {
      chatData.user = userId;
      chatData.admin = adminId;
    } else if (chatType === 'host-admin') {
      chatData.host = userId;
      chatData.admin = adminId;
    }

    if (homestayId) {
      chatData.homestay = homestayId;
    }

    chat = new this(chatData);
    await chat.save();
    await chat.populate('participants', 'username email avatar');
  }

  return chat;
};

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;












