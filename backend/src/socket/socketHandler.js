const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const User = require('../models/User');
const chatService = require('../services/chatService');

// Map để lưu userId -> socketId
const userSocketMap = new Map();

// Map để lưu socketId -> userId
const socketUserMap = new Map();

// Lưu io instance
let ioInstance = null;

// Helper function để emit event đến user cụ thể
function emitToUser(userId, event, data) {
  const socketId = userSocketMap.get(userId);
  if (socketId && ioInstance) {
    ioInstance.to(socketId).emit(event, data);
  }
}

function setupSocketIO(io) {
  ioInstance = io;
  
  // Middleware để xác thực socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Không có token'));
      }

      // Verify token
      const decoded = jwt.verify(token, jwtConfig.secret);
      
      // Tìm user
      const user = await User.findById(decoded.userId).select('_id username email avatar');
      
      if (!user) {
        return next(new Error('User không tồn tại'));
      }

      // Lưu user info vào socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`✅ User connected: ${user.username} (${userId})`);

    // Lưu mapping
    userSocketMap.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);

    // Join room cho user (để có thể gửi tin nhắn trực tiếp)
    socket.join(`user:${userId}`);

    // Join tất cả chat rooms mà user tham gia
    socket.on('join-chats', async () => {
      try {
        const result = await chatService.getUserChats(userId, { limit: 100 });
        result.chats.forEach(chat => {
          socket.join(`chat:${chat._id}`);
        });
        console.log(`User ${user.username} joined ${result.chats.length} chat rooms`);
      } catch (error) {
        console.error('Error joining chats:', error);
      }
    });

    // Join một chat room cụ thể
    socket.on('join-chat', async (chatId) => {
      try {
        // Kiểm tra user có quyền join chat này không
        const chat = await chatService.getChatById(chatId, userId);
        socket.join(`chat:${chatId}`);
        console.log(`User ${user.username} joined chat: ${chatId}`);
        
        // Đánh dấu tin nhắn đã đọc khi join
        await chatService.markMessagesAsRead(chatId, userId);
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // Leave một chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${user.username} left chat: ${chatId}`);
    });

    // Gửi tin nhắn
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, type } = data;

        if (!chatId || !content || !content.trim()) {
          socket.emit('error', { message: 'chatId và content là bắt buộc' });
          return;
        }

        // Gửi tin nhắn qua service
        const message = await chatService.sendMessage(
          chatId,
          userId,
          content.trim(),
          type || 'text'
        );

        // Lấy thông tin chat để biết người nhận
        const chat = await chatService.getChatById(chatId, userId);
        let receiverId;
        
        if (chat.chatType === 'user-host') {
          receiverId = chat.user.toString() === userId 
            ? (typeof chat.host === 'object' ? chat.host._id.toString() : chat.host.toString())
            : (typeof chat.user === 'object' ? chat.user._id.toString() : chat.user.toString());
        } else if (chat.chatType === 'user-admin') {
          receiverId = chat.user.toString() === userId 
            ? (typeof chat.admin === 'object' ? chat.admin._id.toString() : chat.admin.toString())
            : (typeof chat.user === 'object' ? chat.user._id.toString() : chat.user.toString());
        } else if (chat.chatType === 'host-admin') {
          receiverId = chat.host.toString() === userId 
            ? (typeof chat.admin === 'object' ? chat.admin._id.toString() : chat.admin.toString())
            : (typeof chat.host === 'object' ? chat.host._id.toString() : chat.host.toString());
        }

        // Emit tin nhắn mới đến tất cả clients trong chat room
        io.to(`chat:${chatId}`).emit('new-message', {
          message,
          chatId
        });

        // Emit notification đến người nhận (nếu không online trong chat room)
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new-message-notification', {
            message,
            chatId,
            chat
          });
        }

        console.log(`Message sent in chat ${chatId} by ${user.username}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: error.message || 'Không thể gửi tin nhắn' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const { chatId } = data;
      if (chatId) {
        socket.to(`chat:${chatId}`).emit('user-typing', {
          userId,
          username: user.username,
          chatId
        });
      }
    });

    socket.on('stop-typing', (data) => {
      const { chatId } = data;
      if (chatId) {
        socket.to(`chat:${chatId}`).emit('user-stop-typing', {
          userId,
          chatId
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${user.username} (${userId})`);
      userSocketMap.delete(userId);
      socketUserMap.delete(socket.id);
    });
  });

  return io;
}

module.exports = {
  setupSocketIO,
  userSocketMap,
  socketUserMap,
  emitToUser
};

