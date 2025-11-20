const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Homestay = require('../models/Homestay');
const couponService = require('./couponService');

class BookingService {
  // Tạo booking mới
  async createBooking(bookingData, guestId) {
    try {
      const {
        homestayId,
        roomId,
        checkIn,
        checkOut,
        numberOfGuests,
        guestInfo
      } = bookingData;

      // Validation với logging để debug
      console.log('Booking data received:', {
        homestayId,
        roomId,
        checkIn,
        checkOut,
        numberOfGuests,
        numberOfGuestsType: typeof numberOfGuests
      });

      if (!homestayId || !roomId || !checkIn || !checkOut) {
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc: homestayId, roomId, checkIn, checkOut');
      }

      // Kiểm tra numberOfGuests (có thể là số hoặc string)
      const numGuests = Number(numberOfGuests);
      if (!numberOfGuests || isNaN(numGuests) || numGuests < 1) {
        throw new Error('Số lượng khách không hợp lệ');
      }

      // Kiểm tra homestay tồn tại và active
      const homestay = await Homestay.findById(homestayId);
      if (!homestay) {
        throw new Error('Homestay không tồn tại');
      }
      if (homestay.status !== 'active') {
        throw new Error('Homestay không khả dụng');
      }

      // Kiểm tra room tồn tại và thuộc về homestay
      const room = await Room.findById(roomId);
      if (!room) {
        throw new Error('Phòng không tồn tại');
      }
      if (room.homestay.toString() !== homestayId.toString()) {
        throw new Error('Phòng không thuộc về homestay này');
      }
      if (room.status !== 'available') {
        throw new Error('Phòng không khả dụng');
      }

      // Kiểm tra số khách không vượt quá số khách tối đa của phòng
      if (numGuests > room.maxGuests) {
        throw new Error(`Phòng này chỉ có thể chứa tối đa ${room.maxGuests} khách`);
      }

      // Kiểm tra ngày tháng
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        throw new Error('Ngày nhận phòng không được trong quá khứ');
      }
      if (checkOutDate <= checkInDate) {
        throw new Error('Ngày trả phòng phải sau ngày nhận phòng');
      }

      // Kiểm tra conflict với booking khác
      const hasConflict = await Booking.hasConflict(roomId, checkInDate, checkOutDate);
      if (hasConflict) {
        throw new Error('Phòng đã được đặt trong khoảng thời gian này');
      }

      // Tính số đêm và tổng giá
      const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      let originalPrice = room.pricePerNight * numberOfNights;
      let finalPrice = originalPrice;
      let discountAmount = 0;
      let couponCode = null;

      // Áp dụng coupon nếu có
      if (bookingData.couponCode) {
        try {
          const couponResult = await couponService.validateAndApplyCoupon(
            bookingData.couponCode,
            originalPrice,
            guestId,
            null, // bookingId chưa có
            homestayId // truyền homestayId để validate coupon áp dụng cho homestay này
          );
          
          discountAmount = couponResult.discountAmount;
          finalPrice = couponResult.finalPrice;
          couponCode = couponResult.coupon.code;
          originalPrice = couponResult.originalPrice;
        } catch (couponError) {
          throw new Error(`Lỗi mã giảm giá: ${couponError.message}`);
        }
      }

      // Tạo booking
      const booking = new Booking({
        homestay: homestayId,
        room: roomId,
        guest: guestId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        numberOfGuests: numGuests,
        totalPrice: finalPrice,
        originalPrice: originalPrice,
        discountAmount: discountAmount,
        couponCode: couponCode,
        guestInfo: guestInfo || {},
        paymentMethod: bookingData.paymentMethod || null,
        paymentStatus: 'pending'
      });

      await booking.save();

      // Populate thông tin
      await booking.populate([
        { path: 'homestay', select: 'name address images' },
        { path: 'room', select: 'name type pricePerNight' },
        { path: 'guest', select: 'username email' }
      ]);

      return booking.toObject();
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Lấy danh sách booking của guest
  async getGuestBookings(guestId, options = {}) {
    try {
      const { status, page = 1, limit = 10 } = options;

      const query = { guest: guestId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const bookings = await Booking.find(query)
        .populate([
          { path: 'homestay', select: 'name address images' },
          { path: 'room', select: 'name type pricePerNight' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Booking.countDocuments(query);

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting guest bookings:', error);
      throw new Error('Không thể lấy danh sách đặt phòng');
    }
  }

  // Lấy danh sách booking của host (tất cả booking của homestay của host)
  async getHostBookings(hostId, options = {}) {
    try {
      const { status, homestayId, page = 1, limit = 10 } = options;

      // Lấy tất cả homestay của host
      const homestays = await Homestay.find({ host: hostId }).select('_id');
      const homestayIds = homestays.map(h => h._id);

      const query = { homestay: { $in: homestayIds } };
      if (status) {
        query.status = status;
      }
      if (homestayId) {
        query.homestay = homestayId;
      }

      const skip = (page - 1) * limit;

      const bookings = await Booking.find(query)
        .populate([
          { path: 'homestay', select: 'name address' },
          { path: 'room', select: 'name type pricePerNight' },
          { path: 'guest', select: 'username email' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Booking.countDocuments(query);

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting host bookings:', error);
      throw new Error('Không thể lấy danh sách đặt phòng');
    }
  }

  // Lấy tất cả bookings (admin only)
  async getAllBookings(options = {}) {
    try {
      const { status, page = 1, limit = 10 } = options;

      const query = {};
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const bookings = await Booking.find(query)
        .populate([
          { path: 'homestay', select: 'name address host' },
          { path: 'room', select: 'name type pricePerNight' },
          { path: 'guest', select: 'username email' }
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Booking.countDocuments(query);

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all bookings:', error);
      throw new Error('Không thể lấy danh sách đặt phòng');
    }
  }

  // Lấy booking theo ID
  async getBookingById(bookingId, userId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate([
          { path: 'homestay', select: 'name address images host' },
          { path: 'room', select: 'name type pricePerNight' },
          { path: 'guest', select: 'username email' }
        ]);

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra quyền: guest hoặc host của homestay
      const isGuest = booking.guest._id.toString() === userId.toString();
      const isHost = booking.homestay.host && booking.homestay.host.toString() === userId.toString();

      if (!isGuest && !isHost) {
        throw new Error('Bạn không có quyền xem booking này');
      }

      return booking.toObject();
    } catch (error) {
      console.error('Error getting booking:', error);
      throw error;
    }
  }

  // Cập nhật status booking
  async updateBookingStatus(bookingId, status, userId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('homestay', 'host');

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra quyền: chỉ guest hoặc host mới được update
      const isGuest = booking.guest.toString() === userId.toString();
      const isHost = booking.homestay.host && booking.homestay.host.toString() === userId.toString();

      if (!isGuest && !isHost) {
        throw new Error('Bạn không có quyền cập nhật booking này');
      }

      // Validation status
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error('Status không hợp lệ');
      }

      // Logic: guest chỉ có thể cancel, host có thể confirm hoặc cancel
      if (isGuest && status !== 'cancelled') {
        throw new Error('Bạn chỉ có thể hủy booking');
      }

      booking.status = status;
      await booking.save();

      await booking.populate([
        { path: 'homestay', select: 'name address' },
        { path: 'room', select: 'name type pricePerNight' },
        { path: 'guest', select: 'username email' }
      ]);

      return booking.toObject();
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  // Kiểm tra phòng có sẵn trong khoảng thời gian
  async checkRoomAvailability(roomId, checkIn, checkOut) {
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      const hasConflict = await Booking.hasConflict(roomId, checkInDate, checkOutDate);
      return !hasConflict;
    } catch (error) {
      console.error('Error checking room availability:', error);
      throw error;
    }
  }
}

module.exports = new BookingService();


