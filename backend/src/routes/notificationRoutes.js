const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// Lấy danh sách notifications của user
router.get('/', notificationController.getNotifications.bind(notificationController));

// Đếm số notifications chưa đọc
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));

// Đánh dấu notification là đã đọc
router.put('/:id/read', notificationController.markAsRead.bind(notificationController));

// Đánh dấu tất cả notifications là đã đọc
router.put('/mark-all-read', notificationController.markAllAsRead.bind(notificationController));

// Xóa notification
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

// Xóa tất cả notifications đã đọc
router.delete('/read/delete-all', notificationController.deleteAllRead.bind(notificationController));

module.exports = router;

