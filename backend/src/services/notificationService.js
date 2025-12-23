const Notification = require('../models/Notification');
const User = require('../models/User');
const Homestay = require('../models/Homestay');
const Booking = require('../models/Booking');

class NotificationService {
  // Tạo notification mới
  async createNotification(userId, type, title, message, data = {}) {
    try {
      // Lấy role của user
      const user = await User.findById(userId).populate('role');
      if (!user) {
        throw new Error('User không tồn tại');
      }

      const role = user.roleName || 'user';

      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        role
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Lấy notifications của user
  async getUserNotifications(userId, filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        isRead,
        type,
        role
      } = filters;

      const query = { user: userId };

      if (isRead !== undefined) {
        query.isRead = isRead === 'true' || isRead === true;
      }

      if (type) {
        query.type = type;
      }

      if (role) {
        query.role = role;
      }

      const skip = (page - 1) * limit;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Đánh dấu notification là đã đọc
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        throw new Error('Notification không tồn tại hoặc không thuộc về user này');
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Đánh dấu tất cả notifications là đã đọc
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, isRead: false },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Đếm số notifications chưa đọc
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        user: userId,
        isRead: false
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Xóa notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        throw new Error('Notification không tồn tại hoặc không thuộc về user này');
      }

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Xóa tất cả notifications đã đọc
  async deleteAllRead(userId) {
    try {
      const result = await Notification.deleteMany({
        user: userId,
        isRead: true
      });

      return result;
    } catch (error) {
      console.error('Error deleting all read notifications:', error);
      throw error;
    }
  }

  // Helper methods để tạo notifications cho các events cụ thể

  // Booking created - notify user
  async notifyBookingCreated(bookingId, userId) {
    const booking = await Booking.findById(bookingId).populate('homestay room');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    
    return await this.createNotification(
      userId,
      'booking_created',
      'Đặt phòng thành công',
      `Bạn đã đặt phòng tại ${homestayName}. Vui lòng chờ xác nhận từ chủ nhà.`,
      { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString() }
    );
  }

  // Booking confirmed - notify user
  async notifyBookingConfirmed(bookingId, userId) {
    const booking = await Booking.findById(bookingId).populate('homestay room');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    
    return await this.createNotification(
      userId,
      'booking_confirmed',
      'Đặt phòng đã được xác nhận',
      `Đặt phòng tại ${homestayName} đã được xác nhận. Vui lòng thanh toán để hoàn tất.`,
      { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString() }
    );
  }

  // New booking request - notify host
  async notifyNewBookingRequest(bookingId, hostId) {
    const booking = await Booking.findById(bookingId).populate('homestay room guest');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    const guestName = booking.guest?.username || 'Khách hàng';
    
    return await this.createNotification(
      hostId,
      'new_booking_request',
      'Có đặt phòng mới',
      `${guestName} muốn đặt phòng tại ${homestayName}. Vui lòng xác nhận.`,
      { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString(), guestId: booking.guest._id.toString() }
    );
  }

  // Payment success - notify user and host
  async notifyPaymentSuccess(bookingId, userId, hostId) {
    const booking = await Booking.findById(bookingId).populate('homestay room');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    const totalPrice = booking.totalPrice.toLocaleString('vi-VN');
    
    // Notify user
    await this.createNotification(
      userId,
      'payment_success',
      'Thanh toán thành công',
      `Bạn đã thanh toán thành công ${totalPrice} VNĐ cho đặt phòng tại ${homestayName}.`,
      { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString() }
    );

    // Notify host
    if (hostId) {
      await this.createNotification(
        hostId,
        'booking_payment_received',
        'Nhận được thanh toán',
        `Bạn đã nhận được thanh toán ${totalPrice} VNĐ cho đặt phòng tại ${homestayName}.`,
        { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString() }
      );
    }
  }

  // Homestay approved - notify host
  async notifyHomestayApproved(homestayId, hostId) {
    const homestay = await Homestay.findById(homestayId);
    if (!homestay) return;

    return await this.createNotification(
      hostId,
      'homestay_approved',
      'Homestay đã được duyệt',
      `Homestay "${homestay.name}" của bạn đã được duyệt và đã được đăng lên hệ thống.`,
      { homestayId: homestay._id.toString() }
    );
  }

  // Homestay rejected - notify host
  async notifyHomestayRejected(homestayId, hostId, reason = '') {
    const homestay = await Homestay.findById(homestayId);
    if (!homestay) return;

    return await this.createNotification(
      hostId,
      'homestay_rejected',
      'Homestay đã bị từ chối',
      `Homestay "${homestay.name}" của bạn đã bị từ chối.${reason ? ` Lý do: ${reason}` : ''}`,
      { homestayId: homestay._id.toString(), reason }
    );
  }

  // New review - notify host
  async notifyNewReview(reviewId, homestayId, hostId) {
    const homestay = await Homestay.findById(homestayId);
    if (!homestay) return;

    return await this.createNotification(
      hostId,
      'new_review',
      'Có đánh giá mới',
      `Homestay "${homestay.name}" của bạn có đánh giá mới.`,
      { reviewId, homestayId: homestay._id.toString() }
    );
  }

  // Wallet deposit - notify user
  async notifyWalletDeposit(userId, amount) {
    const formattedAmount = amount.toLocaleString('vi-VN');
    
    return await this.createNotification(
      userId,
      'wallet_deposit',
      'Nạp tiền thành công',
      `Bạn đã nạp thành công ${formattedAmount} VNĐ vào ví.`,
      { amount }
    );
  }

  // Wallet withdraw - notify user
  async notifyWalletWithdraw(userId, amount) {
    const formattedAmount = amount.toLocaleString('vi-VN');
    
    return await this.createNotification(
      userId,
      'wallet_withdraw',
      'Rút tiền thành công',
      `Bạn đã rút thành công ${formattedAmount} VNĐ từ ví.`,
      { amount }
    );
  }

  // Booking cancelled - notify user and host
  async notifyBookingCancelled(bookingId, cancelledByUserId) {
    const booking = await Booking.findById(bookingId).populate('homestay room guest');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    const guestId = typeof booking.guest === 'object' ? booking.guest._id : booking.guest;
    const hostId = typeof booking.homestay.host === 'object' 
      ? booking.homestay.host._id 
      : booking.homestay.host;

    // Notify guest
    await this.createNotification(
      guestId,
      'booking_cancelled',
      'Đặt phòng đã bị hủy',
      `Đặt phòng tại ${homestayName} đã bị hủy.`,
      { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString() }
    );

    // Notify host
    if (hostId) {
      const guestName = booking.guest?.username || 'Khách hàng';
      await this.createNotification(
        hostId,
        'booking_cancelled',
        'Đặt phòng đã bị hủy',
        `${guestName} đã hủy đặt phòng tại ${homestayName}.`,
        { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString(), guestId: guestId.toString() }
      );
    }
  }

  // New message - notify receiver
  async notifyNewMessage(chatId, senderId, receiverId, messageContent) {
    const User = require('../models/User');
    const Chat = require('../models/Chat');
    
    const sender = await User.findById(senderId).select('username');
    const chat = await Chat.findById(chatId).populate('homestay', 'name');
    
    if (!sender || !chat) return;

    const senderName = sender.username || 'Người dùng';
    const homestayName = chat.homestay?.name || 'Homestay';
    const preview = messageContent.length > 50 
      ? messageContent.substring(0, 50) + '...' 
      : messageContent;

    return await this.createNotification(
      receiverId,
      'new_message',
      'Tin nhắn mới',
      `${senderName}: ${preview}`,
      { chatId: chat._id.toString(), senderId: sender._id.toString(), homestayId: chat.homestay._id.toString() }
    );
  }

  // Host request approved - notify user
  async notifyHostRequestApproved(userId) {
    return await this.createNotification(
      userId,
      'host_request_approved',
      'Yêu cầu trở thành host đã được duyệt',
      'Chúc mừng! Yêu cầu trở thành host của bạn đã được duyệt. Bạn có thể bắt đầu tạo homestay.',
      {}
    );
  }

  // Host request rejected - notify user
  async notifyHostRequestRejected(userId, reason = '') {
    return await this.createNotification(
      userId,
      'host_request_rejected',
      'Yêu cầu trở thành host bị từ chối',
      `Yêu cầu trở thành host của bạn đã bị từ chối.${reason ? ` Lý do: ${reason}` : ''}`,
      { reason }
    );
  }

  // Booking completed - remind to review
  async notifyBookingCompleted(bookingId, userId) {
    const booking = await Booking.findById(bookingId).populate('homestay room');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    
    return await this.createNotification(
      userId,
      'booking_completed',
      'Đặt phòng đã hoàn thành',
      `Đặt phòng tại ${homestayName} đã hoàn thành. Hãy đánh giá trải nghiệm của bạn!`,
      { bookingId: booking._id.toString(), homestayId: booking.homestay._id.toString() }
    );
  }

  // Host received payment - notify host when money transferred to wallet
  async notifyHostReceivedPayment(bookingId, hostId, amount) {
    const booking = await Booking.findById(bookingId).populate('homestay guest room');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    const roomName = booking.room?.name || 'Phòng';
    const guestName = booking.guest?.username || booking.guest?.email || 'Khách hàng';
    const formattedAmount = amount.toLocaleString('vi-VN');
    
    return await this.createNotification(
      hostId,
      'host_received_payment',
      '💰 Bạn đã nhận được thanh toán',
      `Bạn đã nhận ${formattedAmount} VNĐ từ đơn đặt phòng của ${guestName} tại ${homestayName} - ${roomName}.`,
      { 
        bookingId: booking._id.toString(), 
        homestayId: booking.homestay._id.toString(),
        guestId: booking.guest._id.toString(),
        amount: amount
      }
    );
  }

  // Refund processed - notify user
  async notifyRefundProcessed(bookingId, userId, refundAmount) {
    const booking = await Booking.findById(bookingId).populate('homestay');
    if (!booking) return;

    const homestayName = booking.homestay?.name || 'Homestay';
    const formattedAmount = refundAmount.toLocaleString('vi-VN');
    
    return await this.createNotification(
      userId,
      'refund_processed',
      'Hoàn tiền thành công',
      `Bạn đã được hoàn ${formattedAmount} VNĐ từ đơn đặt phòng tại ${homestayName}.`,
      { 
        bookingId: booking._id.toString(), 
        homestayId: booking.homestay._id.toString(),
        refundAmount: refundAmount
      }
    );
  }

  // Maintenance fee charged - notify host
  async notifyMaintenanceFeeCharged(hostId, amount, balanceAfter) {
    const formattedAmount = amount.toLocaleString('vi-VN');
    const formattedBalance = balanceAfter.toLocaleString('vi-VN');
    const month = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    
    return await this.createNotification(
      hostId,
      'maintenance_fee_charged',
      'Phí duy trì hàng tháng',
      `Phí duy trì hàng tháng ${formattedAmount} VNĐ đã được trừ từ ví của bạn (tháng ${month}). Số dư hiện tại: ${formattedBalance} VNĐ.`,
      {
        amount: amount,
        balanceAfter: balanceAfter,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }
    );
  }

  // Host response to review - notify guest
  async notifyHostResponseToReview(reviewId, homestayId, hostId) {
    const Review = require('../models/Review');
    const Homestay = require('../models/Homestay');
    
    const review = await Review.findById(reviewId).populate('homestay', 'name').populate('guest', '_id');
    const homestay = await Homestay.findById(homestayId);
    
    if (!review || !homestay || !review.guest) return;

    const guestId = typeof review.guest === 'object' 
      ? review.guest._id 
      : review.guest;
    const homestayName = homestay.name || 'Homestay';
    
    return await this.createNotification(
      guestId.toString(),
      'host_response_to_review',
      'Chủ nhà đã phản hồi đánh giá của bạn',
      `Chủ nhà đã phản hồi đánh giá của bạn về homestay "${homestayName}".`,
      { 
        reviewId: review._id.toString(), 
        homestayId: homestay._id.toString(),
        hostId: hostId.toString()
      }
    );
  }

  // Maintenance fee failed - notify host and admin
  async notifyMaintenanceFeeFailed(hostId, requestedAmount, actualDeducted, missingAmount, balanceAfter) {
    const formattedRequested = requestedAmount.toLocaleString('vi-VN');
    const formattedActual = actualDeducted.toLocaleString('vi-VN');
    const formattedMissing = missingAmount.toLocaleString('vi-VN');
    const formattedBalance = balanceAfter.toLocaleString('vi-VN');
    const month = new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    
    // Notify host
    await this.createNotification(
      hostId,
      'maintenance_fee_failed',
      '⚠️ Phí duy trì - Số dư không đủ',
      `Phí duy trì hàng tháng ${formattedRequested} VNĐ không thể trừ đầy đủ do số dư không đủ (tháng ${month}). Đã trừ ${formattedActual} VNĐ, còn thiếu ${formattedMissing} VNĐ. Vui lòng nạp thêm tiền vào ví. Số dư hiện tại: ${formattedBalance} VNĐ.`,
      {
        requestedAmount: requestedAmount,
        actualDeducted: actualDeducted,
        missingAmount: missingAmount,
        balanceAfter: balanceAfter,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }
    );
  }
}

module.exports = new NotificationService();

