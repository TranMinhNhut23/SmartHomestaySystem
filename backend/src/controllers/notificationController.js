const notificationService = require('../services/notificationService');

class NotificationController {
  // Lấy danh sách notifications của user
  async getNotifications(req, res) {
    try {
      const userId = req.userId;
      const filters = {
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        isRead: req.query.isRead,
        type: req.query.type,
        role: req.query.role
      };

      const result = await notificationService.getUserNotifications(userId, filters);

      // Disable cache để luôn lấy dữ liệu mới nhất
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error in getNotifications:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách thông báo'
      });
    }
  }

  // Đếm số notifications chưa đọc
  async getUnreadCount(req, res) {
    try {
      const userId = req.userId;
      const count = await notificationService.getUnreadCount(userId);

      // Disable cache để luôn lấy dữ liệu mới nhất
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy số lượng thông báo chưa đọc'
      });
    }
  }

  // Đánh dấu notification là đã đọc
  async markAsRead(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID là bắt buộc'
        });
      }

      const notification = await notificationService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Đã đánh dấu thông báo là đã đọc',
        data: notification
      });
    } catch (error) {
      console.error('Error in markAsRead:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể đánh dấu thông báo là đã đọc'
      });
    }
  }

  // Đánh dấu tất cả notifications là đã đọc
  async markAllAsRead(req, res) {
    try {
      const userId = req.userId;
      const result = await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'Đã đánh dấu tất cả thông báo là đã đọc',
        data: { modifiedCount: result.modifiedCount }
      });
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể đánh dấu tất cả thông báo là đã đọc'
      });
    }
  }

  // Xóa notification
  async deleteNotification(req, res) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Notification ID là bắt buộc'
        });
      }

      const notification = await notificationService.deleteNotification(id, userId);

      res.json({
        success: true,
        message: 'Đã xóa thông báo',
        data: notification
      });
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể xóa thông báo'
      });
    }
  }

  // Xóa tất cả notifications đã đọc
  async deleteAllRead(req, res) {
    try {
      const userId = req.userId;
      const result = await notificationService.deleteAllRead(userId);

      res.json({
        success: true,
        message: 'Đã xóa tất cả thông báo đã đọc',
        data: { deletedCount: result.deletedCount }
      });
    } catch (error) {
      console.error('Error in deleteAllRead:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể xóa tất cả thông báo đã đọc'
      });
    }
  }
}

module.exports = new NotificationController();

