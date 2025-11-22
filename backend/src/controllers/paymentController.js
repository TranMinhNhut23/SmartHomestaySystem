const paymentService = require('../services/paymentService');
const bookingService = require('../services/bookingService');
const couponService = require('../services/couponService');
const Booking = require('../models/Booking');

class PaymentController {
  // Tạo payment URL từ MoMo
  async createPayment(req, res) {
    try {
      const { bookingId, amount, orderInfo } = req.body;
      const userId = req.userId;

      if (!bookingId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'bookingId và amount là bắt buộc'
        });
      }

      // Kiểm tra booking thuộc về user
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking không tồn tại'
        });
      }

      if (booking.guest.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thanh toán booking này'
        });
      }

      // Tạo redirect URL và IPN URL
      // LƯU Ý: BASE_URL phải là URL công khai có thể truy cập từ internet
      // Không được dùng localhost hoặc IP nội bộ (192.168.x.x, 10.x.x.x)
      // Có thể dùng ngrok hoặc deploy lên server có domain
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      
      // Kiểm tra và cảnh báo nếu dùng localhost/IP nội bộ
      if (baseUrl.includes('localhost') || 
          baseUrl.includes('127.0.0.1') || 
          /192\.168\.\d+\.\d+/.test(baseUrl) ||
          /10\.\d+\.\d+\.\d+/.test(baseUrl)) {
        console.warn('⚠️ CẢNH BÁO: BASE_URL đang dùng localhost/IP nội bộ!');
        console.warn('⚠️ MoMo không thể truy cập localhost từ server của họ.');
        console.warn('⚠️ Vui lòng cấu hình BASE_URL là URL công khai (ví dụ: dùng ngrok)');
        console.warn('⚠️ Hoặc deploy lên server có domain công khai');
      }
      
      const redirectUrl = `${baseUrl}/api/payments/momo/return`;
      const ipnUrl = `${baseUrl}/api/payments/momo/ipn`;
      
      console.log('Redirect URL:', redirectUrl);
      console.log('IPN URL:', ipnUrl);

      // Extra data chứa bookingId để xử lý sau
      const bookingIdStr = bookingId.toString();
      const extraData = JSON.stringify({ bookingId: bookingIdStr });

      const paymentData = {
        bookingId,
        amount: parseInt(amount),
        orderInfo: orderInfo || `Thanh toán đặt phòng #${bookingIdStr.slice(-8)}`,
        redirectUrl,
        ipnUrl,
        extraData
      };

      const result = await paymentService.createPayment(paymentData);

      // Lưu orderId và requestId vào booking để xử lý callback
      booking.paymentTransactionId = result.orderId;
      await booking.save();

      res.status(200).json({
        success: true,
        data: {
          paymentUrl: result.paymentUrl,
          qrCodeUrl: result.qrCodeUrl,
          orderId: result.orderId
        }
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Tạo payment URL thất bại'
      });
    }
  }

  // Xử lý IPN callback từ MoMo
  async handleMoMoIPN(req, res) {
    try {
      console.log('--------------------MOMO IPN CALLBACK----------------');
      console.log('Full IPN body:', JSON.stringify(req.body, null, 2));

      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
      } = req.body;

      console.log('MoMo IPN received:', {
        orderId,
        resultCode,
        amount,
        transId,
        extraData,
        signature: signature ? signature.substring(0, 20) + '...' : 'missing'
      });

      // Xác thực signature
      const isValid = paymentService.verifySignature(req.body, signature);
      if (!isValid) {
        console.error('❌ Invalid signature from MoMo IPN');
        console.error('Expected signature format:', paymentService.getExpectedSignatureFormat(req.body));
        return res.status(400).json({
          resultCode: -1,
          message: 'Invalid signature'
        });
      }
      
      console.log('✅ Signature verified successfully');

      // Parse extraData để lấy bookingId
      // extraData từ MoMo có thể là base64 hoặc JSON string tùy theo cách gửi
      let bookingId = null;
      
      if (!extraData || extraData.trim() === '') {
        console.warn('⚠️ extraData is empty');
      } else {
        console.log('Parsing extraData:', extraData);
        
        try {
          // Thử decode base64 trước
          const extraDataDecoded = Buffer.from(extraData, 'base64').toString('utf-8');
          console.log('Decoded extraData:', extraDataDecoded);
          const extraDataObj = JSON.parse(extraDataDecoded);
          bookingId = extraDataObj.bookingId;
          console.log('✅ Parsed bookingId from base64:', bookingId);
        } catch (error) {
          console.log('Not base64, trying direct parse...');
          // Thử parse trực tiếp nếu không phải base64
          try {
            const extraDataObj = JSON.parse(extraData);
            bookingId = extraDataObj.bookingId;
            console.log('✅ Parsed bookingId from JSON string:', bookingId);
          } catch (e) {
            console.error('❌ Error parsing extraData:', e.message);
            console.error('extraData value:', extraData);
          }
        }
      }

      if (!bookingId) {
        console.error('❌ Cannot find bookingId in extraData');
        return res.status(400).json({
          resultCode: -1,
          message: 'Không tìm thấy bookingId trong extraData'
        });
      }

      // Tìm booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        console.error('❌ Booking not found:', bookingId);
        return res.status(404).json({
          resultCode: -1,
          message: 'Booking không tồn tại'
        });
      }

      console.log('Found booking:', {
        bookingId: booking._id,
        currentStatus: booking.status,
        currentPaymentStatus: booking.paymentStatus
      });

      // Cập nhật payment status
      if (resultCode === 0) {
        // Thanh toán thành công
        booking.paymentStatus = 'paid';
        booking.paymentTransactionId = transId || orderId;
        booking.status = 'confirmed'; // Tự động confirm booking khi thanh toán thành công
        await booking.save();

        // Tăng số lần sử dụng coupon nếu có
        if (booking.couponCode) {
          await couponService.incrementCouponUsage(booking.couponCode);
        }

        console.log(`✅ Payment successful for booking ${bookingId}, transId: ${transId}`);
        console.log('Updated booking:', {
          paymentStatus: booking.paymentStatus,
          status: booking.status,
          paymentTransactionId: booking.paymentTransactionId,
          couponCode: booking.couponCode
        });
      } else {
        // Thanh toán thất bại
        booking.paymentStatus = 'failed';
        await booking.save();

        console.log(`❌ Payment failed for booking ${bookingId}, message: ${message}`);
      }

      // Trả về response cho MoMo (theo format yêu cầu)
      res.status(200).json({
        resultCode: 0,
        message: 'Success'
      });
    } catch (error) {
      console.error('Handle MoMo IPN error:', error);
      res.status(500).json({
        resultCode: -1,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Xử lý redirect sau khi thanh toán
  async handleMoMoReturn(req, res) {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
      } = req.query;

      console.log('MoMo return callback:', {
        orderId,
        resultCode,
        amount,
        transId
      });

      // Decode URL-encoded extraData từ query params
      let decodedExtraData = extraData;
      if (extraData) {
        try {
          decodedExtraData = decodeURIComponent(extraData);
        } catch (e) {
          console.warn('Error decoding URL-encoded extraData:', e);
        }
      }

      // Xác thực signature
      const callbackData = {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData: decodedExtraData
      };

      console.log('Return callback - extraData (decoded):', decodedExtraData);

      const isValid = paymentService.verifySignature(callbackData, signature);
      if (!isValid) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8081'}/payment-failed?message=Invalid signature`);
      }

      // Parse extraData để lấy bookingId
      // extraData từ return callback đã được URL decode, có thể là JSON string hoặc base64
      let bookingId = null;
      
      if (!decodedExtraData || decodedExtraData.trim() === '') {
        console.warn('⚠️ extraData is empty in return callback');
      } else {
        try {
          // Thử parse JSON trực tiếp trước (vì từ query params có thể đã là JSON string)
          const extraDataObj = JSON.parse(decodedExtraData);
          bookingId = extraDataObj.bookingId;
          console.log('✅ Parsed bookingId from JSON string:', bookingId);
        } catch (error) {
          // Nếu không parse được, thử decode base64
          try {
            const extraDataDecoded = Buffer.from(decodedExtraData, 'base64').toString('utf-8');
            const extraDataObj = JSON.parse(extraDataDecoded);
            bookingId = extraDataObj.bookingId;
            console.log('✅ Parsed bookingId from base64:', bookingId);
          } catch (e) {
            console.error('❌ Error parsing extraData:', e.message);
            console.error('extraData value:', decodedExtraData);
          }
        }
      }

      if (resultCode === 0) {
        // Thanh toán thành công - redirect đến trang thành công
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        return res.redirect(`${frontendUrl}/payment-success?bookingId=${bookingId}&transId=${transId}`);
      } else {
        // Thanh toán thất bại - redirect đến trang thất bại
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        return res.redirect(`${frontendUrl}/payment-failed?bookingId=${bookingId}&message=${encodeURIComponent(message)}`);
      }
    } catch (error) {
      console.error('Handle MoMo return error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      return res.redirect(`${frontendUrl}/payment-failed?message=${encodeURIComponent(error.message)}`);
    }
  }

  // ==================== VNPAY METHODS ====================

  // Tạo payment URL từ VNPay
  async createVNPayPayment(req, res) {
    try {
      const { bookingId, amount, orderInfo } = req.body;
      const userId = req.userId;

      if (!bookingId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'bookingId và amount là bắt buộc'
        });
      }

      // Kiểm tra booking thuộc về user
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking không tồn tại'
        });
      }

      if (booking.guest.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thanh toán booking này'
        });
      }

      // Tạo return URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const returnUrl = `${baseUrl}/api/payments/vnpay/callback`;

      // Lấy IP address của client
      // VNPay chỉ chấp nhận IPv4, không chấp nhận IPv6
      let ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   '127.0.0.1';
      
      // Lấy IP đầu tiên nếu có nhiều IP
      ipAddr = ipAddr.split(',')[0].trim();
      
      // Convert IPv6-mapped IPv4 (::ffff:192.168.x.x) về IPv4
      if (ipAddr.startsWith('::ffff:')) {
        ipAddr = ipAddr.replace('::ffff:', '');
      }
      
      // Nếu vẫn là IPv6, dùng IP mặc định
      if (ipAddr.includes(':')) {
        console.warn('⚠️ IPv6 address detected, using default IP:', ipAddr);
        ipAddr = '127.0.0.1';
      }

      const bookingIdStr = bookingId.toString();
      const paymentData = {
        bookingId,
        amount: parseInt(amount),
        orderInfo: orderInfo || `Thanh toan don hang #${bookingIdStr.slice(-8)}`,
        returnUrl,
        ipAddr: ipAddr
      };

      // Log thông tin request
      console.log('====================VNPAY PAYMENT REQUEST====================');
      console.log('User ID:', userId);
      console.log('Booking ID:', bookingId);
      console.log('Amount:', amount);
      console.log('Order Info:', orderInfo);
      console.log('Return URL:', returnUrl);
      console.log('IP Address:', ipAddr);
      console.log('Base URL:', baseUrl);
      console.log('============================================================');

      const result = await paymentService.createVNPayPaymentUrl(paymentData);

      // Lưu TxnRef vào booking để xử lý callback
      booking.paymentTransactionId = result.txnRef;
      await booking.save();

      console.log('VNPay payment URL created successfully. TxnRef:', result.txnRef);

      res.status(200).json({
        success: true,
        data: {
          paymentUrl: result.paymentUrl,
          txnRef: result.txnRef
        }
      });
    } catch (error) {
      console.error('====================VNPAY PAYMENT ERROR====================');
      console.error('Error in createVNPayPayment:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Request body:', req.body);
      console.error('==========================================================');
      
      // Trả về error message chi tiết hơn
      const errorMessage = error.message || 'Tạo payment URL thất bại';
      const isConfigError = errorMessage.includes('Thiếu cấu hình') || errorMessage.includes('VNPAY');
      
      res.status(isConfigError ? 500 : 500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          originalError: error.originalError?.message
        } : undefined
      });
    }
  }

  // Xử lý callback từ VNPay
  async handleVNPayReturn(req, res) {
    try {
      console.log('--------------------VNPAY RETURN CALLBACK----------------');
      console.log('VNPay return query:', JSON.stringify(req.query, null, 2));

      const vnpayData = req.query;

      // Verify payment
      const verifyResult = paymentService.verifyVNPayPayment(vnpayData);

      if (!verifyResult.verified) {
        console.error('====================VNPAY SIGNATURE VERIFICATION FAILED====================');
        console.error('❌ Invalid signature from VNPay');
        console.error('Response Code:', verifyResult.response_code);
        console.error('TxnRef:', verifyResult.txn_ref);
        console.error('Debug Info:', JSON.stringify(verifyResult.debug, null, 2));
        console.error('VNPay Data:', JSON.stringify(vnpayData, null, 2));
        console.error('=======================================================================');
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        const errorMessage = verifyResult.error 
          ? `Lỗi xác thực: ${verifyResult.error}` 
          : 'Chữ ký không hợp lệ. Vui lòng kiểm tra cấu hình VNPAY_HASH_SECRET trong file .env';
        return res.redirect(`${frontendUrl}/payment-failed?message=${encodeURIComponent(errorMessage)}`);
      }

      console.log('✅ Signature verified successfully');

      // Lấy bookingId từ TxnRef (format: bookingId + timestamp)
      // TxnRef có format: bookingId + timestamp, cần parse để lấy bookingId
      const vnp_TxnRef = verifyResult.txn_ref;
      let bookingId = null;

      // Tìm booking bằng paymentTransactionId (đã lưu TxnRef)
      if (vnp_TxnRef) {
        const booking = await Booking.findOne({ paymentTransactionId: vnp_TxnRef });
        if (booking) {
          bookingId = booking._id.toString();
        } else {
          // Thử parse bookingId từ TxnRef (format: bookingId + timestamp)
          // TxnRef thường là ObjectId (24 ký tự) + timestamp
          // Tìm booking bằng cách match bookingId từ đầu TxnRef
          if (vnp_TxnRef.length >= 24) {
            const possibleBookingId = vnp_TxnRef.substring(0, 24);
            const bookingById = await Booking.findById(possibleBookingId);
            if (bookingById) {
              bookingId = bookingById._id.toString();
            }
          }
        }
      }

      if (!bookingId) {
        console.error('❌ Cannot find bookingId from TxnRef:', vnp_TxnRef);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        return res.redirect(`${frontendUrl}/payment-failed?message=Không tìm thấy booking`);
      }

      // Tìm booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        console.error('❌ Booking not found:', bookingId);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        return res.redirect(`${frontendUrl}/payment-failed?message=Booking không tồn tại`);
      }

      console.log('Found booking:', {
        bookingId: booking._id,
        currentStatus: booking.status,
        currentPaymentStatus: booking.paymentStatus
      });

      // Cập nhật payment status dựa trên ResponseCode
      // ResponseCode = '00' nghĩa là thanh toán thành công
      if (verifyResult.response_code === '00') {
        // Thanh toán thành công
        booking.paymentStatus = 'paid';
        booking.paymentTransactionId = vnp_TxnRef;
        booking.status = 'confirmed'; // Tự động confirm booking khi thanh toán thành công
        await booking.save();

        // Tăng số lần sử dụng coupon nếu có
        if (booking.couponCode) {
          await couponService.incrementCouponUsage(booking.couponCode);
        }

        console.log(`✅ Payment successful for booking ${bookingId}, TxnRef: ${vnp_TxnRef}`);
        console.log('Updated booking:', {
          paymentStatus: booking.paymentStatus,
          status: booking.status,
          paymentTransactionId: booking.paymentTransactionId,
          couponCode: booking.couponCode
        });

        // Redirect đến trang thành công
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        return res.redirect(`${frontendUrl}/payment-success?bookingId=${bookingId}&transId=${vnp_TxnRef}`);
      } else {
        // Thanh toán thất bại
        booking.paymentStatus = 'failed';
        await booking.save();

        console.log(`❌ Payment failed for booking ${bookingId}, ResponseCode: ${verifyResult.response_code}`);

        // Redirect đến trang thất bại
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        const message = `Thanh toán thất bại (Mã lỗi: ${verifyResult.response_code})`;
        return res.redirect(`${frontendUrl}/payment-failed?bookingId=${bookingId}&message=${encodeURIComponent(message)}`);
      }
    } catch (error) {
      console.error('Handle VNPay return error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      return res.redirect(`${frontendUrl}/payment-failed?message=${encodeURIComponent(error.message)}`);
    }
  }
}

module.exports = new PaymentController();

