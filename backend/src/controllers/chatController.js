const chatService = require('../services/chatService');

class ChatController {
  // Tìm hoặc tạo chat
  async findOrCreateChat(req, res) {
    try {
      const userId = req.userId;
      const { hostId, homestayId } = req.body;

      if (!hostId || !homestayId) {
        return res.status(400).json({
          success: false,
          message: 'hostId và homestayId là bắt buộc'
        });
      }

      const chat = await chatService.findOrCreateChat(userId, hostId, homestayId);

      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      console.error('Find or create chat error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể tạo chat'
      });
    }
  }

  // Lấy danh sách chat của user
  async getUserChats(req, res) {
    try {
      const userId = req.userId;
      const userRole = req.user?.roleName || 'user'; // Lấy role từ req.user
      const { page, limit } = req.query;

      const result = await chatService.getUserChats(userId, userRole, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });

      res.status(200).json({
        success: true,
        data: result.chats,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get user chats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách chat'
      });
    }
  }

  // Lấy tin nhắn trong chat
  async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.userId;
      const { page, limit } = req.query;

      const messages = await chatService.getChatMessages(chatId, userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50
      });

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể lấy tin nhắn'
      });
    }
  }

  // Gửi tin nhắn (REST API - Socket.io sẽ xử lý realtime)
  async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const senderId = req.userId;
      const { content, type } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung tin nhắn là bắt buộc'
        });
      }

      const message = await chatService.sendMessage(
        chatId,
        senderId,
        content,
        type || 'text'
      );

      res.status(201).json({
        success: true,
        message: 'Gửi tin nhắn thành công',
        data: message
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể gửi tin nhắn'
      });
    }
  }

  // Lấy chat theo ID
  async getChatById(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.userId;

      const chat = await chatService.getChatById(chatId, userId);

      res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy chat'
      });
    }
  }

  // Đánh dấu tin nhắn đã đọc
  async markMessagesAsRead(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.userId;

      await chatService.markMessagesAsRead(chatId, userId);

      res.status(200).json({
        success: true,
        message: 'Đã đánh dấu đã đọc'
      });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể đánh dấu đã đọc'
      });
    }
  }

  // Lấy số chat chưa đọc
  async getUnreadCount(req, res) {
    try {
      const userId = req.userId;
      const count = await chatService.getUnreadChatCount(userId);

      res.status(200).json({
        success: true,
        data: { unreadCount: count }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy số tin nhắn chưa đọc'
      });
    }
  }
}

module.exports = new ChatController();












