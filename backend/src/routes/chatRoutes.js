const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// Tìm hoặc tạo chat
router.post('/find-or-create', chatController.findOrCreateChat.bind(chatController));

// Lấy danh sách chat của user
router.get('/my-chats', chatController.getUserChats.bind(chatController));

// Lấy số chat chưa đọc
router.get('/unread-count', chatController.getUnreadCount.bind(chatController));

// Lấy chat theo ID
router.get('/:chatId', chatController.getChatById.bind(chatController));

// Lấy tin nhắn trong chat
router.get('/:chatId/messages', chatController.getChatMessages.bind(chatController));

// Gửi tin nhắn
router.post('/:chatId/messages', chatController.sendMessage.bind(chatController));

// Đánh dấu tin nhắn đã đọc
router.put('/:chatId/read', chatController.markMessagesAsRead.bind(chatController));

module.exports = router;

















