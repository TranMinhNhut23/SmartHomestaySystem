const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const Homestay = require('../models/Homestay');
const notificationService = require('./notificationService');
const uploadService = require('./uploadService');

class ChatService {
  // Tìm hoặc tạo chat giữa user và host cho homestay
  async findOrCreateChat(userId, hostId, homestayId) {
    try {
      // Validate
      if (!userId || !hostId || !homestayId) {
        throw new Error('userId, hostId và homestayId là bắt buộc');
      }

      // Kiểm tra homestay tồn tại và host là chủ của homestay
      const homestay = await Homestay.findById(homestayId).populate('host');
      if (!homestay) {
        throw new Error('Homestay không tồn tại');
      }

      const homestayHostId = typeof homestay.host === 'object' 
        ? homestay.host._id.toString() 
        : homestay.host.toString();

      if (homestayHostId !== hostId.toString()) {
        throw new Error('User này không phải là host của homestay');
      }

      // Tìm hoặc tạo chat
      const chat = await Chat.findOrCreateChat(userId, hostId, homestayId);
      
      // Populate thông tin
      await chat.populate([
        { path: 'user', select: 'username email avatar roleName' },
        { path: 'host', select: 'username email avatar roleName' },
        { path: 'admin', select: 'username email avatar roleName' },
        { path: 'homestay', select: 'name images' },
        { path: 'lastMessage' }
      ]);

      return chat.toObject();
    } catch (error) {
      console.error('Error finding or creating chat:', error);
      throw error;
    }
  }

  // Lấy danh sách chat của user (theo role)
  async getUserChats(userId, userRole, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      // Xây dựng query dựa trên role
      const query = {
        participants: userId,
        isActive: true
      };

      // Filter theo role
      if (userRole === 'user') {
        // User: chỉ hiển thị chat với host và admin
        query.chatType = { $in: ['user-host', 'user-admin'] };
      } else if (userRole === 'host') {
        // Host: chỉ hiển thị chat với user và admin
        query.chatType = { $in: ['user-host', 'host-admin'] };
      } else if (userRole === 'admin') {
        // Admin: hiển thị tất cả chat
        query.chatType = { $in: ['user-host', 'user-admin', 'host-admin'] };
      }

      const chats = await Chat.find(query)
        .populate([
          { path: 'user', select: 'username email avatar roleName' },
          { path: 'host', select: 'username email avatar roleName' },
          { path: 'admin', select: 'username email avatar roleName' },
          { path: 'homestay', select: 'name images' },
          { 
            path: 'lastMessage',
            select: 'content type createdAt sender',
            populate: { path: 'sender', select: 'username avatar' }
          }
        ])
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Chat.countDocuments(query);

      return {
        chats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw new Error('Không thể lấy danh sách chat');
    }
  }

  // Lấy tin nhắn trong chat
  async getChatMessages(chatId, userId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;

      // Kiểm tra user có quyền xem chat này không
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat không tồn tại');
      }

      const isParticipant = chat.participants.some(
        p => p.toString() === userId.toString()
      );

      if (!isParticipant) {
        throw new Error('Bạn không có quyền xem chat này');
      }

      // Đếm tổng số tin nhắn
      const totalMessages = await Message.countDocuments({ chat: chatId });
      
      // Tính toán để load từ cuối lên (tin nhắn mới nhất trước)
      // Page 1: load 50 tin nhắn mới nhất
      // Page 2: load 50 tin nhắn tiếp theo (cũ hơn)
      // Sort từ mới đến cũ, nhưng skip từ cuối
      const sortOrder = -1; // Mới đến cũ
      const skip = Math.max(0, totalMessages - (page * limit));
      const actualLimit = Math.min(limit, totalMessages - skip);

      // Lấy tin nhắn - sort từ mới đến cũ, nhưng sẽ reverse lại ở frontend
      const messages = await Message.find({ chat: chatId })
        .populate('sender', 'username email avatar')
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(actualLimit);

      // Đánh dấu tin nhắn là đã đọc
      await Message.markAllAsRead(chatId, userId);

      // Cập nhật unreadCount dựa trên chatType và userId
      let unreadField = 'user';
      if (chat.chatType === 'user-host') {
        unreadField = chat.user.toString() === userId.toString() ? 'user' : 'host';
      } else if (chat.chatType === 'user-admin') {
        unreadField = chat.user.toString() === userId.toString() ? 'user' : 'admin';
      } else if (chat.chatType === 'host-admin') {
        unreadField = chat.host.toString() === userId.toString() ? 'host' : 'admin';
      }
      chat.unreadCount[unreadField] = 0;
      await chat.save();

      // Reverse để trả về từ cũ đến mới (cũ trên, mới dưới)
      return messages.reverse();
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  // Gửi tin nhắn
  async sendMessage(chatId, senderId, content, type = 'text') {
    try {
      // Kiểm tra chat tồn tại và user là participant
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat không tồn tại');
      }

      const isParticipant = chat.participants.some(
        p => p.toString() === senderId.toString()
      );

      if (!isParticipant) {
        throw new Error('Bạn không có quyền gửi tin nhắn trong chat này');
      }

      // Xử lý upload ảnh nếu là type image
      let messageContent = content.trim();
      if (type === 'image' && content.startsWith('data:image')) {
        try {
          // Upload ảnh lên server
          const imageUrl = await uploadService.saveChatImage(content, senderId, chatId);
          messageContent = imageUrl; // Lưu URL thay vì base64
        } catch (error) {
          console.error('Error uploading chat image:', error);
          throw new Error('Không thể upload ảnh: ' + error.message);
        }
      }

      // Tạo tin nhắn
      const message = new Message({
        chat: chatId,
        sender: senderId,
        content: messageContent,
        type: type
      });

      await message.save();

      // Cập nhật chat: lastMessage và lastMessageAt
      chat.lastMessage = message._id;
      chat.lastMessageAt = new Date();
      
      // Tăng unreadCount cho người nhận dựa trên chatType
      let receiverField = 'user';
      if (chat.chatType === 'user-host') {
        receiverField = chat.user.toString() === senderId.toString() ? 'host' : 'user';
      } else if (chat.chatType === 'user-admin') {
        receiverField = chat.user.toString() === senderId.toString() ? 'admin' : 'user';
      } else if (chat.chatType === 'host-admin') {
        receiverField = chat.host.toString() === senderId.toString() ? 'admin' : 'host';
      }
      chat.unreadCount[receiverField] = (chat.unreadCount[receiverField] || 0) + 1;
      
      await chat.save();

      // Populate để trả về đầy đủ thông tin
      await message.populate('sender', 'username email avatar');

      // Tạo notification cho người nhận
      try {
        let receiverId;
        if (chat.chatType === 'user-host') {
          receiverId = chat.user.toString() === senderId.toString() 
            ? (typeof chat.host === 'object' ? chat.host._id : chat.host)
            : (typeof chat.user === 'object' ? chat.user._id : chat.user);
        } else if (chat.chatType === 'user-admin') {
          receiverId = chat.user.toString() === senderId.toString() 
            ? (typeof chat.admin === 'object' ? chat.admin._id : chat.admin)
            : (typeof chat.user === 'object' ? chat.user._id : chat.user);
        } else if (chat.chatType === 'host-admin') {
          receiverId = chat.host.toString() === senderId.toString() 
            ? (typeof chat.admin === 'object' ? chat.admin._id : chat.admin)
            : (typeof chat.host === 'object' ? chat.host._id : chat.host);
        }
        
        if (receiverId) {
          await notificationService.notifyNewMessage(
            chatId,
            senderId,
            receiverId,
            content.trim()
          );
        }
      } catch (notifError) {
        console.error('Error creating message notification:', notifError);
        // Không throw error, chỉ log
      }

      return message.toObject();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Lấy chat theo ID
  async getChatById(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId)
        .populate([
          { path: 'user', select: 'username email avatar roleName' },
          { path: 'host', select: 'username email avatar roleName' },
          { path: 'admin', select: 'username email avatar roleName' },
          { path: 'homestay', select: 'name images address' },
          { 
            path: 'lastMessage',
            populate: { path: 'sender', select: 'username avatar' }
          }
        ]);

      if (!chat) {
        throw new Error('Chat không tồn tại');
      }

      // Kiểm tra quyền
      const isParticipant = chat.participants.some(
        p => p.toString() === userId.toString()
      );

      if (!isParticipant) {
        throw new Error('Bạn không có quyền xem chat này');
      }

      return chat.toObject();
    } catch (error) {
      console.error('Error getting chat:', error);
      throw error;
    }
  }

  // Đánh dấu tin nhắn đã đọc
  async markMessagesAsRead(chatId, userId) {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new Error('Chat không tồn tại');
      }

      const isParticipant = chat.participants.some(
        p => p.toString() === userId.toString()
      );

      if (!isParticipant) {
        throw new Error('Bạn không có quyền xem chat này');
      }

      // Đánh dấu tất cả tin nhắn là đã đọc
      await Message.markAllAsRead(chatId, userId);

      // Reset unreadCount dựa trên chatType
      let unreadField = 'user';
      if (chat.chatType === 'user-host') {
        unreadField = chat.user.toString() === userId.toString() ? 'user' : 'host';
      } else if (chat.chatType === 'user-admin') {
        unreadField = chat.user.toString() === userId.toString() ? 'user' : 'admin';
      } else if (chat.chatType === 'host-admin') {
        unreadField = chat.host.toString() === userId.toString() ? 'host' : 'admin';
      }
      chat.unreadCount[unreadField] = 0;
      await chat.save();

      return { success: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Đếm số chat chưa đọc
  async getUnreadChatCount(userId) {
    try {
      const chats = await Chat.find({
        participants: userId,
        isActive: true
      });

      let totalUnread = 0;
      
      for (const chat of chats) {
        // Xác định unreadField dựa trên chatType và userId
        let unreadField = 'user';
        if (chat.chatType === 'user-host') {
          unreadField = chat.user.toString() === userId.toString() ? 'user' : 'host';
        } else if (chat.chatType === 'user-admin') {
          unreadField = chat.user.toString() === userId.toString() ? 'user' : 'admin';
        } else if (chat.chatType === 'host-admin') {
          unreadField = chat.host.toString() === userId.toString() ? 'host' : 'admin';
        }
        totalUnread += (chat.unreadCount[unreadField] || 0);
      }

      return totalUnread;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

module.exports = new ChatService();

