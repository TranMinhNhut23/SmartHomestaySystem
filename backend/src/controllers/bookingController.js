const bookingService = require('../services/bookingService');
const notificationService = require('../services/notificationService');
const Homestay = require('../models/Homestay');

class BookingController {
  // Tạo booking mới
  async createBooking(req, res) {
    try {
      const guestId = req.userId;
      const {
        homestayId,
        roomId,
        checkIn,
        checkOut,
        numberOfGuests,
        guestInfo,
        paymentMethod,
        couponCode
      } = req.body;

      const booking = await bookingService.createBooking(
        {
          homestayId,
          roomId,
          checkIn,
          checkOut,
          numberOfGuests,
          guestInfo,
          paymentMethod,
          couponCode
        },
        guestId
      );

      // Tạo notification cho user
      try {
        await notificationService.notifyBookingCreated(booking._id, guestId);
      } catch (notifError) {
        console.error('Error creating booking notification:', notifError);
        // Không throw error, chỉ log
      }

      // Tạo notification cho host
      try {
        const homestay = await Homestay.findById(homestayId).select('host');
        if (homestay && homestay.host) {
          const hostId = typeof homestay.host === 'object' ? homestay.host._id : homestay.host;
          await notificationService.notifyNewBookingRequest(booking._id, hostId);
        }
      } catch (notifError) {
        console.error('Error creating host notification:', notifError);
        // Không throw error, chỉ log
      }

      res.status(201).json({
        success: true,
        message: 'Đặt phòng thành công',
        data: booking
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Đặt phòng thất bại'
      });
    }
  }

  // Lấy danh sách booking của guest
  async getGuestBookings(req, res) {
    try {
      const guestId = req.userId;
      const { status, page, limit } = req.query;

      const result = await bookingService.getGuestBookings(guestId, {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.status(200).json({
        success: true,
        data: result.bookings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get guest bookings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách đặt phòng'
      });
    }
  }

  // Lấy danh sách booking của host
  async getHostBookings(req, res) {
    try {
      const hostId = req.userId;
      const { status, homestayId, page, limit } = req.query;

      const result = await bookingService.getHostBookings(hostId, {
        status,
        homestayId,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.status(200).json({
        success: true,
        data: result.bookings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get host bookings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách đặt phòng'
      });
    }
  }

  // Lấy tất cả bookings (admin only)
  async getAllBookings(req, res) {
    try {
      const { status, page, limit } = req.query;

      const result = await bookingService.getAllBookings({
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      res.status(200).json({
        success: true,
        data: result.bookings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all bookings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách đặt phòng'
      });
    }
  }

  // Lấy booking theo ID
  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const booking = await bookingService.getBookingById(id, userId);

      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy booking'
      });
    }
  }

  // Cập nhật status booking
  async updateBookingStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.userId;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status là bắt buộc'
        });
      }

      const booking = await bookingService.updateBookingStatus(id, status, userId);

      // Tạo notification khi booking được confirm
      if (status === 'confirmed') {
        try {
          const guestId = typeof booking.guest === 'object' ? booking.guest._id : booking.guest;
          await notificationService.notifyBookingConfirmed(id, guestId);
        } catch (notifError) {
          console.error('Error creating confirmation notification:', notifError);
        }
      }

      // Tạo notification khi booking bị cancelled
      if (status === 'cancelled') {
        try {
          await notificationService.notifyBookingCancelled(id, userId);
        } catch (notifError) {
          console.error('Error creating cancellation notification:', notifError);
        }
      }

      // Tạo notification khi booking completed (nhắc đánh giá)
      if (status === 'completed') {
        try {
          const guestId = typeof booking.guest === 'object' ? booking.guest._id : booking.guest;
          await notificationService.notifyBookingCompleted(id, guestId);
        } catch (notifError) {
          console.error('Error creating completion notification:', notifError);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật booking thành công',
        data: booking
      });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật booking thất bại'
      });
    }
  }

  // Kiểm tra phòng có sẵn
  async checkRoomAvailability(req, res) {
    try {
      const { roomId, checkIn, checkOut } = req.query;

      if (!roomId || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: 'roomId, checkIn, checkOut là bắt buộc'
        });
      }

      const isAvailable = await bookingService.checkRoomAvailability(roomId, checkIn, checkOut);

      res.status(200).json({
        success: true,
        data: {
          available: isAvailable
        }
      });
    } catch (error) {
      console.error('Check room availability error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể kiểm tra phòng'
      });
    }
  }

  // Xử lý hoàn tiền thủ công (admin only) - dùng cho tranh chấp hoặc thanh toán lỗi
  async processManualRefund(req, res) {
    try {
      const { id } = req.params;
      const { reason, percentage } = req.body;
      const adminId = req.userId;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Lý do hoàn tiền là bắt buộc'
        });
      }

      if (!percentage || percentage < 0 || percentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Phần trăm hoàn tiền phải từ 0-100'
        });
      }

      const result = await bookingService.processManualRefund(id, {
        reason,
        percentage: parseInt(percentage),
        processedBy: adminId
      });

      // Tạo notification cho khách hàng
      try {
        const guestId = typeof result.booking.guest === 'object' 
          ? result.booking.guest._id 
          : result.booking.guest;
        await notificationService.notifyRefundProcessed(id, guestId, result.refundAmount);
      } catch (notifError) {
        console.error('Error creating refund notification:', notifError);
      }

      res.status(200).json({
        success: true,
        message: 'Xử lý hoàn tiền thành công',
        data: result
      });
    } catch (error) {
      console.error('Process manual refund error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Xử lý hoàn tiền thất bại'
      });
    }
  }

  // User gửi yêu cầu hoàn tiền
  async requestRefund(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.userId;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lý do yêu cầu hoàn tiền là bắt buộc'
        });
      }

      const booking = await bookingService.requestRefund(id, userId, reason);

      // Tạo notification cho admin/host
      try {
        // TODO: Thêm notification service
        console.log('TODO: Send notification to admin about refund request');
      } catch (notifError) {
        console.error('Error creating refund request notification:', notifError);
      }

      res.status(200).json({
        success: true,
        message: 'Yêu cầu hoàn tiền đã được gửi',
        data: booking
      });
    } catch (error) {
      console.error('Request refund error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Gửi yêu cầu hoàn tiền thất bại'
      });
    }
  }

  // Lấy danh sách bookings có thể yêu cầu hoàn tiền
  async getRefundableBookings(req, res) {
    try {
      const userId = req.userId;

      const bookings = await bookingService.getRefundableBookings(userId);

      res.status(200).json({
        success: true,
        data: bookings
      });
    } catch (error) {
      console.error('Get refundable bookings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách booking'
      });
    }
  }

  // Admin lấy danh sách yêu cầu hoàn tiền
  async getRefundRequests(req, res) {
    try {
      const { status, page, limit } = req.query;

      const result = await bookingService.getRefundRequests({
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });

      res.status(200).json({
        success: true,
        data: result.bookings,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get refund requests error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách yêu cầu hoàn tiền'
      });
    }
  }

  // Xử lý chuyển tiền cho host (có thể được gọi sau khi booking paid)
  async processHostPayment(req, res) {
    try {
      const { id } = req.params;

      const result = await bookingService.processHostPayment(id);

      res.status(200).json({
        success: true,
        message: 'Chuyển tiền cho host thành công',
        data: result
      });
    } catch (error) {
      console.error('Process host payment error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể chuyển tiền cho host'
      });
    }
  }

  // Update payment status (sẽ tự động transfer tiền cho host nếu status = 'paid')
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentTransactionId, paymentMethod } = req.body;

      if (!paymentStatus) {
        return res.status(400).json({
          success: false,
          message: 'Payment status là bắt buộc'
        });
      }

      const validStatuses = ['pending', 'paid', 'failed', 'refunded', 'partial_refunded'];
      if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Payment status không hợp lệ'
        });
      }

      const booking = await bookingService.updateBookingPaymentStatus(id, paymentStatus, {
        paymentTransactionId,
        paymentMethod
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật payment status thành công',
        data: booking
      });
    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật payment status thất bại'
      });
    }
  }

  // Host lấy danh sách yêu cầu hoàn tiền
  async getHostRefundRequests(req, res) {
    try {
      const hostId = req.userId;
      const { status = 'pending', page = 1, limit = 20 } = req.query;

      const result = await bookingService.getHostRefundRequests(hostId, {
        status,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách yêu cầu hoàn tiền thành công',
        data: result
      });
    } catch (error) {
      console.error('Error getting host refund requests:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách yêu cầu hoàn tiền'
      });
    }
  }

  // Host xử lý yêu cầu hoàn tiền (approve/reject)
  async processHostRefundRequest(req, res) {
    try {
      const hostId = req.userId;
      const { id: bookingId } = req.params;
      const { action, adminNote } = req.body;

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action không hợp lệ. Chỉ chấp nhận "approve" hoặc "reject"'
        });
      }

      const result = await bookingService.processHostRefundRequest(
        bookingId,
        hostId,
        action,
        adminNote
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      console.error('Error processing host refund request:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xử lý yêu cầu hoàn tiền'
      });
    }
  }

  // Thanh toán bằng ví
  async payWithWallet(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const result = await bookingService.payWithWallet(id, userId);

      res.status(200).json({
        success: true,
        message: 'Thanh toán bằng ví thành công',
        data: result
      });
    } catch (error) {
      console.error('Pay with wallet error:', error);
      
      // Kiểm tra nếu lỗi do số dư không đủ
      const statusCode = error.message && error.message.includes('không đủ') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Thanh toán bằng ví thất bại'
      });
    }
  }
}

module.exports = new BookingController();


