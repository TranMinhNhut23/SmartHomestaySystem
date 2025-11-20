const bookingService = require('../services/bookingService');

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
}

module.exports = new BookingController();


