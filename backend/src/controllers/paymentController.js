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
}

module.exports = new PaymentController();

