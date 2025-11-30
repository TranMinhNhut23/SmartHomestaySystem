const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Homestay = require('../models/Homestay');
const couponService = require('./couponService');
const walletService = require('./walletService');

/**
 * BookingService - Xử lý logic booking và payment
 * 
 * 🏦 HOST WALLET PAYMENT FLOW:
 * ============================
 * 
 * Khi booking được thanh toán thành công:
 * 1. User thanh toán qua MoMo/VNPay/Wallet
 * 2. Payment callback cập nhật booking.paymentStatus = 'paid'
 * 3. Gọi updateBookingPaymentStatus() → Tự động trigger processHostPayment()
 * 4. Tiền được chuyển vào ví của host
 * 5. Host nhận notification về việc nhận tiền
 * 
 * CÁCH SỬ DỤNG:
 * ==============
 * 
 * Option 1: Tự động (Khuyến nghị)
 * ```javascript
 * // Trong payment callback (MoMo/VNPay)
 * await bookingService.updateBookingPaymentStatus(bookingId, 'paid', {
 *   paymentTransactionId: txnRef,
 *   paymentMethod: 'momo'
 * });
 * // → Tự động chuyển tiền cho host
 * ```
 * 
 * Option 2: Thủ công
 * ```javascript
 * // Cập nhật payment status trước
 * booking.paymentStatus = 'paid';
 * await booking.save();
 * 
 * // Sau đó manually trigger host payment
 * await bookingService.processHostPayment(bookingId);
 * ```
 * 
 * API Endpoints:
 * - PUT /api/bookings/:id/payment-status - Cập nhật payment status (auto trigger)
 * - POST /api/bookings/:id/process-host-payment - Manual trigger host payment
 */
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

      // Email sẽ được gửi sau khi thanh toán thành công (xem paymentController)

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

      // XỬ LÝ HỦY ĐƠN VÀ HOÀN TIỀN
      if (status === 'cancelled' && booking.status !== 'cancelled') {
        // Xác định ai hủy
        const cancelledBy = isHost ? 'host' : 'guest';
        booking.cancelledBy = cancelledBy;
        booking.cancelledAt = new Date();

        // Chỉ hoàn tiền nếu booking đã thanh toán
        if (booking.paymentStatus === 'paid') {
          try {
            // Tính % hoàn tiền
            const refundPercentage = booking.calculateRefundPercentage(cancelledBy);
            
            if (refundPercentage > 0) {
              // Tính số tiền hoàn (dựa trên totalPrice - số tiền thực sự đã trả)
              const refundAmount = Math.round((booking.totalPrice * refundPercentage) / 100);

              console.log(`Processing refund for booking ${bookingId}:`);
              console.log(`- Cancelled by: ${cancelledBy}`);
              console.log(`- Total price paid: ${booking.totalPrice} VND`);
              console.log(`- Refund percentage: ${refundPercentage}%`);
              console.log(`- Refund amount: ${refundAmount} VND`);

              // Hoàn tiền vào ví khách hàng
              const guestId = booking.guest.toString();
              const refundResult = await walletService.refund(guestId, refundAmount, {
                bookingId: booking._id,
                description: `Hoàn tiền đơn đặt phòng #${booking._id.toString().slice(-8)} - ${refundPercentage}% (${cancelledBy === 'host' ? 'Chủ nhà hủy' : 'Khách hủy'})`,
                note: cancelledBy === 'host' 
                  ? 'Hoàn 100% do chủ nhà hủy đơn'
                  : refundPercentage === 100
                    ? 'Hoàn 100% do hủy trước 3 ngày'
                    : refundPercentage === 50
                      ? 'Hoàn 50% do hủy trong vòng 3 ngày trước check-in'
                      : 'Không hoàn tiền do hủy quá muộn',
                metadata: {
                  bookingId: booking._id,
                  originalAmount: booking.totalPrice,
                  refundPercentage: refundPercentage,
                  cancelledBy: cancelledBy,
                  cancelledAt: booking.cancelledAt,
                  paymentMethod: booking.paymentMethod
                }
              });

              // Cập nhật thông tin refund vào booking
              booking.refund = {
                status: 'completed',
                amount: refundAmount,
                percentage: refundPercentage,
                reason: cancelledBy === 'host' 
                  ? 'Chủ nhà hủy đơn - hoàn 100%'
                  : refundPercentage === 100
                    ? 'Hủy trước 3 ngày - hoàn 100%'
                    : refundPercentage === 50
                      ? 'Hủy trong vòng 3 ngày - hoàn 50%'
                      : 'Hủy sau check-in - không hoàn',
                processedAt: new Date(),
                transactionId: refundResult.transaction._id.toString()
              };

              // Cập nhật payment status
              booking.paymentStatus = refundPercentage === 100 ? 'refunded' : 'partial_refunded';

              console.log(`✅ Refund completed successfully`);
              console.log(`- Transaction ID: ${refundResult.transaction._id}`);
              console.log(`- New wallet balance: ${refundResult.wallet.balance} VND`);
            } else {
              // Không hoàn tiền nhưng vẫn ghi nhận
              booking.refund = {
                status: 'completed',
                amount: 0,
                percentage: 0,
                reason: 'Hủy sau giờ check-in - không được hoàn tiền',
                processedAt: new Date(),
                transactionId: null
              };
              console.log(`ℹ️ No refund - cancelled after check-in time`);
            }
          } catch (refundError) {
            console.error('Error processing refund:', refundError);
            // Đánh dấu refund thất bại nhưng vẫn hủy booking
            booking.refund = {
              status: 'rejected',
              amount: 0,
              percentage: 0,
              reason: `Lỗi khi hoàn tiền: ${refundError.message}`,
              processedAt: new Date(),
              transactionId: null
            };
          }
        } else {
          // Booking chưa thanh toán hoặc đã thất bại - không cần hoàn tiền
          console.log(`ℹ️ No refund needed - payment status: ${booking.paymentStatus}`);
        }
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

  // Xử lý hoàn tiền thủ công (admin only) - dùng cho tranh chấp hoặc thanh toán lỗi
  async processManualRefund(bookingId, refundData) {
    try {
      const { reason, percentage, processedBy } = refundData;

      const booking = await Booking.findById(bookingId)
        .populate([
          { path: 'homestay', select: 'name' },
          { path: 'guest', select: 'username email' }
        ]);

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra booking đã thanh toán chưa
      if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'partial_refunded') {
        throw new Error('Booking chưa được thanh toán hoặc đã hoàn tiền đầy đủ');
      }

      // Kiểm tra đã hoàn tiền chưa
      if (booking.refund && booking.refund.status === 'completed' && booking.paymentStatus === 'refunded') {
        throw new Error('Booking này đã được hoàn tiền 100%');
      }

      // Tính số tiền hoàn
      let refundAmount = Math.round((booking.totalPrice * percentage) / 100);

      // Nếu đã hoàn một phần, chỉ hoàn phần còn lại
      if (booking.refund && booking.refund.amount > 0) {
        const alreadyRefunded = booking.refund.amount;
        const maxRefund = booking.totalPrice - alreadyRefunded;
        refundAmount = Math.min(refundAmount, maxRefund);
        
        if (refundAmount <= 0) {
          throw new Error('Không thể hoàn thêm tiền. Đã hoàn tối đa.');
        }
      }

      console.log(`Processing manual refund for booking ${bookingId}:`);
      console.log(`- Reason: ${reason}`);
      console.log(`- Percentage: ${percentage}%`);
      console.log(`- Refund amount: ${refundAmount} VND`);
      console.log(`- Processed by admin: ${processedBy}`);

      // Hoàn tiền vào ví khách hàng
      const guestId = booking.guest._id || booking.guest;
      const refundResult = await walletService.refund(guestId, refundAmount, {
        bookingId: booking._id,
        description: `Hoàn tiền thủ công đơn đặt phòng #${booking._id.toString().slice(-8)} - ${percentage}%`,
        note: reason,
        metadata: {
          bookingId: booking._id,
          originalAmount: booking.totalPrice,
          refundPercentage: percentage,
          manualRefund: true,
          processedBy: processedBy,
          processedAt: new Date()
        }
      });

      // Tính tổng % đã hoàn
      const previousRefundAmount = booking.refund ? booking.refund.amount : 0;
      const totalRefunded = previousRefundAmount + refundAmount;
      const totalRefundPercentage = Math.round((totalRefunded / booking.totalPrice) * 100);

      // Cập nhật thông tin refund vào booking
      booking.refund = {
        status: 'completed',
        amount: totalRefunded,
        percentage: totalRefundPercentage,
        reason: reason,
        processedAt: new Date(),
        transactionId: refundResult.transaction._id.toString()
      };

      // Cập nhật payment status
      booking.paymentStatus = totalRefundPercentage >= 100 ? 'refunded' : 'partial_refunded';

      // Nếu chưa hủy, tự động hủy
      if (booking.status !== 'cancelled') {
        booking.status = 'cancelled';
        booking.cancelledBy = 'system';
        booking.cancelledAt = new Date();
      }

      await booking.save();

      console.log(`✅ Manual refund completed successfully`);
      console.log(`- Transaction ID: ${refundResult.transaction._id}`);
      console.log(`- Total refunded: ${totalRefunded} VND (${totalRefundPercentage}%)`);
      console.log(`- New wallet balance: ${refundResult.wallet.balance} VND`);

      return {
        booking: booking.toObject(),
        refundAmount: refundAmount,
        totalRefunded: totalRefunded,
        totalRefundPercentage: totalRefundPercentage
      };
    } catch (error) {
      console.error('Error processing manual refund:', error);
      throw error;
    }
  }

  // User gửi yêu cầu hoàn tiền
  async requestRefund(bookingId, userId, requestReason) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate([
          { path: 'homestay', select: 'name' },
          { path: 'guest', select: 'username email' }
        ]);

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra quyền: chỉ guest mới được yêu cầu hoàn tiền
      if (booking.guest._id.toString() !== userId.toString()) {
        throw new Error('Bạn không có quyền yêu cầu hoàn tiền cho booking này');
      }

      // Kiểm tra booking phải đã thanh toán và confirmed
      if (booking.paymentStatus !== 'paid') {
        throw new Error('Chỉ có thể yêu cầu hoàn tiền cho đơn đã thanh toán');
      }

      if (booking.status !== 'confirmed') {
        throw new Error('Chỉ có thể yêu cầu hoàn tiền cho đơn đã được xác nhận');
      }

      // Kiểm tra đã yêu cầu hoàn tiền chưa
      if (booking.refundRequest && booking.refundRequest.requested) {
        throw new Error('Bạn đã gửi yêu cầu hoàn tiền cho đơn này rồi');
      }

      // Kiểm tra đã hoàn tiền chưa
      if (booking.refund && (booking.refund.status === 'completed' || booking.refund.status === 'pending')) {
        throw new Error('Đơn này đã được hoàn tiền hoặc đang xử lý');
      }

      if (!requestReason || requestReason.trim().length === 0) {
        throw new Error('Vui lòng nhập lý do yêu cầu hoàn tiền');
      }

      // Cập nhật refund request
      booking.refundRequest = {
        requested: true,
        requestedAt: new Date(),
        requestReason: requestReason.trim(),
        requestedBy: userId,
        adminNote: null,
        processedBy: null
      };

      // Cập nhật refund status thành pending
      if (!booking.refund || booking.refund.status === 'none') {
        booking.refund = {
          status: 'pending',
          amount: 0,
          percentage: 0,
          reason: 'Đang chờ xử lý yêu cầu hoàn tiền từ khách hàng',
          processedAt: null,
          transactionId: null
        };
      } else {
        booking.refund.status = 'pending';
      }

      await booking.save();

      console.log(`✅ Refund request created for booking ${bookingId}`);
      console.log(`- Requested by: ${userId}`);
      console.log(`- Reason: ${requestReason}`);

      return booking.toObject();
    } catch (error) {
      console.error('Error requesting refund:', error);
      throw error;
    }
  }

  // Lấy danh sách bookings có thể yêu cầu hoàn tiền (paid + confirmed)
  async getRefundableBookings(userId) {
    try {
      const bookings = await Booking.find({
        guest: userId,
        paymentStatus: 'paid',
        status: 'confirmed',
        'refundRequest.requested': { $ne: true }  // Chưa yêu cầu hoàn tiền
      })
        .populate([
          { path: 'homestay', select: 'name address images' },
          { path: 'room', select: 'name type pricePerNight' }
        ])
        .sort({ checkIn: -1 });

      return bookings;
    } catch (error) {
      console.error('Error getting refundable bookings:', error);
      throw new Error('Không thể lấy danh sách booking');
    }
  }

  // Admin lấy danh sách yêu cầu hoàn tiền
  async getRefundRequests(options = {}) {
    try {
      const { status = 'pending', page = 1, limit = 20 } = options;

      const query = {
        'refundRequest.requested': true
      };

      if (status === 'pending') {
        query['refund.status'] = 'pending';
      } else if (status === 'completed') {
        query['refund.status'] = 'completed';
      } else if (status === 'rejected') {
        query['refund.status'] = 'rejected';
      }

      const skip = (page - 1) * limit;

      const bookings = await Booking.find(query)
        .populate([
          { path: 'homestay', select: 'name address' },
          { path: 'room', select: 'name type pricePerNight' },
          { path: 'guest', select: 'username email' },
          { path: 'refundRequest.requestedBy', select: 'username email' },
          { path: 'refundRequest.processedBy', select: 'username email' }
        ])
        .sort({ 'refundRequest.requestedAt': -1 })
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
      console.error('Error getting refund requests:', error);
      throw new Error('Không thể lấy danh sách yêu cầu hoàn tiền');
    }
  }

  // Host lấy danh sách yêu cầu hoàn tiền cho homestays của mình
  async getHostRefundRequests(hostId, options = {}) {
    try {
      const { status = 'pending', page = 1, limit = 20 } = options;

      // Tìm tất cả homestays của host
      const Homestay = require('../models/Homestay');
      const homestays = await Homestay.find({ host: hostId }).select('_id');
      const homestayIds = homestays.map(h => h._id);

      const query = {
        homestay: { $in: homestayIds },
        'refundRequest.requested': true
      };

      if (status === 'pending') {
        query['refund.status'] = 'pending';
      } else if (status === 'completed') {
        query['refund.status'] = 'completed';
      } else if (status === 'rejected') {
        query['refund.status'] = 'rejected';
      }

      const skip = (page - 1) * limit;

      const bookings = await Booking.find(query)
        .populate([
          { path: 'homestay', select: 'name address images' },
          { path: 'room', select: 'name type pricePerNight' },
          { path: 'guest', select: 'username email phone' },
          { path: 'refundRequest.requestedBy', select: 'username email' },
          { path: 'refundRequest.processedBy', select: 'username email' }
        ])
        .sort({ 'refundRequest.requestedAt': -1 })
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
      console.error('Error getting host refund requests:', error);
      throw new Error('Không thể lấy danh sách yêu cầu hoàn tiền');
    }
  }

  // Host xử lý yêu cầu hoàn tiền (approve/reject)
  async processHostRefundRequest(bookingId, hostId, action, adminNote = '') {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('homestay', 'host name');

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra booking thuộc về host
      const homestayHostId = typeof booking.homestay.host === 'object' 
        ? booking.homestay.host._id.toString() 
        : booking.homestay.host.toString();

      if (homestayHostId !== hostId.toString()) {
        throw new Error('Bạn không có quyền xử lý yêu cầu hoàn tiền này');
      }

      if (!booking.refundRequest || !booking.refundRequest.requested) {
        throw new Error('Không có yêu cầu hoàn tiền cho booking này');
      }

      if (booking.refund.status !== 'pending') {
        throw new Error('Yêu cầu hoàn tiền đã được xử lý');
      }

      if (action === 'approve') {
        // Tính toán số tiền hoàn lại dựa trên booking model method
        const refundPercentage = booking.calculateRefundPercentage('guest');
        const refundAmount = Math.round(booking.totalPrice * (refundPercentage / 100));

        console.log(`💰 Processing refund approval:`);
        console.log(`- Booking ID: ${bookingId}`);
        console.log(`- Total Price: ${booking.totalPrice}`);
        console.log(`- Refund Percentage: ${refundPercentage}%`);
        console.log(`- Refund Amount: ${refundAmount}`);

        // Cập nhật booking
        booking.refund = {
          status: 'completed',
          amount: refundAmount,
          percentage: refundPercentage,
          reason: booking.refundRequest.requestReason || 'Host approved refund request',
          processedAt: new Date(),
          transactionId: null
        };

        // Hoàn tiền: Trừ từ ví host, cộng vào ví user
        // QUAN TRỌNG: Phải làm TRƯỚC khi update booking để có thể rollback nếu lỗi
        let hostWithdrawTransaction = null;
        let userDepositTransaction = null;

        if (refundAmount > 0) {
          const walletService = require('./walletService');
          const Wallet = require('../models/Wallet');
          
          // Kiểm tra số dư ví host trước
          const hostWallet = await Wallet.findOne({ user: hostId });
          if (!hostWallet) {
            throw new Error('Ví host không tồn tại');
          }

          if (hostWallet.balance < refundAmount) {
            throw new Error(
              `Số dư ví không đủ để hoàn tiền.\n` +
              `Cần: ${refundAmount.toLocaleString('vi-VN')} VNĐ\n` +
              `Hiện có: ${hostWallet.balance.toLocaleString('vi-VN')} VNĐ\n` +
              `Thiếu: ${(refundAmount - hostWallet.balance).toLocaleString('vi-VN')} VNĐ`
            );
          }
          
          // 1. Trừ tiền từ ví host
          try {
            const withdrawResult = await walletService.withdraw(hostId, refundAmount, {
              status: 'completed',
              paymentMethod: 'wallet',
              description: `Hoàn tiền cho khách - Booking #${booking._id.toString().slice(-8)} (${refundPercentage}%)`,
              metadata: {
                bookingId: booking._id,
                refundPercentage: refundPercentage,
                originalAmount: booking.totalPrice,
                guestId: booking.guest,
                source: 'host_refund_to_guest',
                transactionType: 'refund_withdrawal'
              }
            });
            hostWithdrawTransaction = withdrawResult.transaction;
            console.log(`✅ Deducted ${refundAmount} VNĐ from host wallet`);
          } catch (hostWithdrawError) {
            console.error('❌ Error deducting from host wallet:', hostWithdrawError);
            throw new Error(`Không thể trừ tiền từ ví host: ${hostWithdrawError.message}`);
          }

          // 2. Cộng tiền vào ví user
          try {
            const refundResult = await walletService.deposit(booking.guest, refundAmount, {
              status: 'completed',
              paymentMethod: 'wallet',
              description: `Hoàn tiền booking #${booking._id.toString().slice(-8)} (${refundPercentage}%)`,
              metadata: {
                bookingId: booking._id,
                refundPercentage: refundPercentage,
                originalAmount: booking.totalPrice,
                hostId: hostId,
                source: 'host_approved_refund',
                transactionType: 'refund_deposit'
              }
            });
            userDepositTransaction = refundResult.transaction;
            console.log(`✅ Refund deposited to user wallet: ${refundAmount} VNĐ`);
          } catch (userDepositError) {
            console.error('❌ Error depositing to user wallet:', userDepositError);
            // TODO: Rollback host withdraw nếu cần
            throw new Error(`Không thể chuyển tiền vào ví user: ${userDepositError.message}`);
          }
        }

        // Chỉ update booking SAU KHI tiền đã được xử lý thành công
        booking.refundRequest.processedBy = hostId;
        booking.refundRequest.adminNote = adminNote || 'Đã được host chấp nhận';
        booking.status = 'cancelled';
        booking.cancelledBy = 'host'; // Enum: 'guest' | 'host' | 'system'
        booking.cancelledAt = new Date();

        if (userDepositTransaction) {
          booking.refund.transactionId = userDepositTransaction._id;
        }

        await booking.save();

        // Gửi notification cho user
        try {
          const notificationService = require('./notificationService');
          await notificationService.notifyRefundProcessed(bookingId, booking.guest, refundAmount);
        } catch (notifError) {
          console.error('Error sending refund notification:', notifError);
        }

        console.log(`✅ Host approved refund request for booking ${bookingId}`);
        return { success: true, refundAmount, message: 'Đã chấp nhận yêu cầu hoàn tiền' };

      } else if (action === 'reject') {
        // Từ chối hoàn tiền
        booking.refund = {
          status: 'rejected',
          amount: 0,
          percentage: 0,
          reason: adminNote || 'Host từ chối yêu cầu hoàn tiền',
          processedAt: new Date(),
          transactionId: null
        };

        booking.refundRequest.processedBy = hostId;
        booking.refundRequest.adminNote = adminNote || 'Đã bị host từ chối';

        await booking.save();

        console.log(`❌ Host rejected refund request for booking ${bookingId}`);
        return { success: true, message: 'Đã từ chối yêu cầu hoàn tiền' };

      } else {
        throw new Error('Action không hợp lệ. Chỉ chấp nhận "approve" hoặc "reject"');
      }
    } catch (error) {
      console.error('Error processing host refund request:', error);
      throw error;
    }
  }

  // Xử lý chuyển tiền cho host khi booking được thanh toán thành công
  async processHostPayment(bookingId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate([
          { path: 'homestay', select: 'name host' },
          { path: 'guest', select: 'username email' },
          { path: 'room', select: 'name' }
        ]);

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra booking đã thanh toán chưa
      if (booking.paymentStatus !== 'paid') {
        throw new Error('Booking chưa được thanh toán');
      }

      // Lấy host ID
      const hostId = booking.homestay.host;
      if (!hostId) {
        throw new Error('Không tìm thấy thông tin host');
      }

      // Số tiền host nhận (totalPrice - đã trừ discount)
      const hostReceiveAmount = booking.totalPrice;

      console.log(`💰 Processing host payment for booking ${bookingId}:`);
      console.log(`- Host ID: ${hostId}`);
      console.log(`- Amount: ${hostReceiveAmount} VNĐ`);
      console.log(`- Homestay: ${booking.homestay.name}`);

      // Chuyển tiền vào ví host
      const notificationService = require('./notificationService');
      
      try {
        const result = await walletService.receiveBookingPayment(hostId, hostReceiveAmount, {
          bookingId: booking._id,
          description: `Nhận tiền từ đơn đặt phòng #${booking._id.toString().slice(-8)} - ${booking.homestay.name}`,
          note: `Khách: ${booking.guest.username || booking.guest.email}`,
          paymentMethod: booking.paymentMethod,
          metadata: {
            bookingId: booking._id,
            guestId: booking.guest._id,
            homestayId: booking.homestay._id,
            roomId: booking.room._id,
            originalPrice: booking.originalPrice || booking.totalPrice,
            discountAmount: booking.discountAmount || 0,
            couponCode: booking.couponCode || null
          }
        });

        console.log(`✅ Host payment successful!`);
        console.log(`- Transaction ID: ${result.transaction._id}`);
        console.log(`- Host new balance: ${result.wallet.balance} VNĐ`);

        // Tạo notification cho host
        try {
          await notificationService.notifyHostReceivedPayment(
            booking._id,
            hostId,
            hostReceiveAmount
          );
          console.log(`✅ Notification sent to host`);
        } catch (notifError) {
          console.error('Error sending notification to host:', notifError);
          // Không throw error, chỉ log
        }

        return {
          success: true,
          booking: booking,
          hostPayment: result,
          amount: hostReceiveAmount
        };
      } catch (paymentError) {
        console.error('❌ Error processing host payment:', paymentError);
        throw paymentError;
      }
    } catch (error) {
      console.error('Error in processHostPayment:', error);
      throw error;
    }
  }

  // Update payment status VÀ tự động chuyển tiền cho host
  async updateBookingPaymentStatus(bookingId, paymentStatus, paymentData = {}) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      const oldPaymentStatus = booking.paymentStatus;
      
      // Cập nhật payment status
      booking.paymentStatus = paymentStatus;
      if (paymentData.paymentTransactionId) {
        booking.paymentTransactionId = paymentData.paymentTransactionId;
      }
      if (paymentData.paymentMethod) {
        booking.paymentMethod = paymentData.paymentMethod;
      }
      
      await booking.save();

      console.log(`📝 Booking ${bookingId} payment status updated: ${oldPaymentStatus} → ${paymentStatus}`);

      // Nếu booking vừa chuyển sang 'paid', tự động transfer tiền cho host
      if (paymentStatus === 'paid' && oldPaymentStatus !== 'paid') {
        console.log(`🔔 Triggering automatic host payment for booking ${bookingId}...`);
        
        try {
          await this.processHostPayment(bookingId);
        } catch (hostPaymentError) {
          console.error('❌ Auto host payment failed (booking payment status still updated):', hostPaymentError);
          // Không throw error để không ảnh hưởng đến việc update payment status
          // Admin có thể manually trigger lại sau
        }
      }

      return booking;
    } catch (error) {
      console.error('Error updating booking payment status:', error);
      throw error;
    }
  }

  // Thanh toán bằng ví
  async payWithWallet(bookingId, userId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate([
          { path: 'homestay', select: 'name host' },
          { path: 'guest', select: 'username email' }
        ]);

      if (!booking) {
        throw new Error('Booking không tồn tại');
      }

      // Kiểm tra booking thuộc về user
      const guestId = typeof booking.guest === 'object' ? booking.guest._id.toString() : booking.guest.toString();
      if (guestId !== userId.toString()) {
        throw new Error('Bạn không có quyền thanh toán booking này');
      }

      // Kiểm tra booking đã thanh toán chưa
      if (booking.paymentStatus === 'paid') {
        throw new Error('Booking đã được thanh toán');
      }

      // Kiểm tra booking đã bị hủy chưa
      if (booking.status === 'cancelled') {
        throw new Error('Không thể thanh toán booking đã bị hủy');
      }

      const totalAmount = booking.totalPrice;

      console.log(`💰 Processing wallet payment for booking ${bookingId}:`);
      console.log(`- User ID: ${userId}`);
      console.log(`- Amount: ${totalAmount} VNĐ`);

      // Trừ tiền từ ví user
      const paymentResult = await walletService.payment(userId, totalAmount, {
        bookingId: booking._id,
        description: `Thanh toán đơn đặt phòng #${booking._id.toString().slice(-8)}`,
        note: `Homestay: ${booking.homestay?.name || 'N/A'}`,
        metadata: {
          bookingId: booking._id,
          homestayId: typeof booking.homestay === 'object' ? booking.homestay._id : booking.homestay,
          guestId: guestId,
          totalPrice: totalAmount,
          originalPrice: booking.originalPrice || totalAmount,
          discountAmount: booking.discountAmount || 0,
          couponCode: booking.couponCode || null
        }
      });

      console.log(`✅ Wallet payment successful! Transaction ID: ${paymentResult.transaction._id}`);

      // Cập nhật booking
      booking.paymentStatus = 'paid';
      booking.paymentMethod = 'wallet';
      booking.status = 'confirmed'; // Tự động confirm booking khi thanh toán thành công
      booking.paymentTransactionId = paymentResult.transaction._id.toString();
      await booking.save();

      // Tăng số lần sử dụng coupon nếu có
      if (booking.couponCode) {
        try {
          await couponService.incrementCouponUsage(booking.couponCode);
        } catch (couponError) {
          console.error('Error incrementing coupon usage:', couponError);
          // Không throw error, chỉ log
        }
      }

      // Tự động chuyển tiền cho host
      try {
        await this.processHostPayment(bookingId);
        console.log(`✅ Host payment processed successfully`);
      } catch (hostPaymentError) {
        console.error('❌ Error processing host payment:', hostPaymentError);
        // Không throw error, chỉ log (tiền đã trừ từ ví user rồi)
      }

      // Populate thông tin để trả về
      await booking.populate([
        { path: 'homestay', select: 'name address images' },
        { path: 'room', select: 'name type pricePerNight' },
        { path: 'guest', select: 'username email' }
      ]);

      // Tạo notifications
      try {
        const notificationService = require('./notificationService');
        const hostId = typeof booking.homestay === 'object' && booking.homestay.host
          ? (typeof booking.homestay.host === 'object' ? booking.homestay.host._id : booking.homestay.host)
          : null;
        
        await notificationService.notifyPaymentSuccess(bookingId, userId, hostId);
      } catch (notifError) {
        console.error('Error creating payment notifications:', notifError);
        // Không throw error, chỉ log
      }

      return {
        booking: booking.toObject(),
        transaction: paymentResult.transaction,
        wallet: paymentResult.wallet
      };
    } catch (error) {
      console.error('Error in payWithWallet:', error);
      throw error;
    }
  }
}

module.exports = new BookingService();


