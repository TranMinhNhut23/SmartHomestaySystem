const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Cấu hình email từ .env
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true cho 465, false cho các port khác
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify connection khi khởi tạo
    this.verifyConnection();
  }

  // Kiểm tra kết nối email
  async verifyConnection() {
    // Kiểm tra xem có cấu hình email không
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email service: Chưa cấu hình email (EMAIL_USER hoặc EMAIL_PASSWORD chưa được thiết lập)');
      console.warn('Email service: Email sẽ không được gửi. Xem hướng dẫn trong EMAIL_SETUP.md');
      return;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service: Kết nối email thành công');
    } catch (error) {
      console.error('❌ Email service: Lỗi kết nối email:', error.message);
      console.warn('Email service: Email sẽ không được gửi nếu cấu hình không đúng');
      console.warn('Email service: Vui lòng kiểm tra lại cấu hình trong file .env (xem EMAIL_SETUP.md)');
    }
  }

  // Tạo template email xác nhận đặt phòng
  createBookingConfirmationTemplate(bookingData) {
    const {
      bookingId,
      guestName,
      homestayName,
      roomName,
      checkIn,
      checkOut,
      numberOfGuests,
      numberOfNights,
      totalPrice,
      originalPrice,
      discountAmount,
      couponCode,
      address,
      paymentMethod,
      paymentStatus
    } = bookingData;

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatPrice = (price) => {
      return new Intl.NumberFormat('vi-VN').format(price || 0);
    };

    const paymentMethodText = paymentMethod === 'momo' ? 'Ví MoMo' : 
                              paymentMethod === 'vnpay' ? 'VNPay' : 
                              paymentMethod === 'cash' ? 'Tiền mặt' : 'Chưa chọn';

    const paymentStatusText = paymentStatus === 'paid' ? 'Đã thanh toán' : 
                             paymentStatus === 'pending' ? 'Chờ thanh toán' : 
                             paymentStatus === 'failed' ? 'Thanh toán thất bại' : 'Chưa thanh toán';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận đặt phòng</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header-gradient {
      background: linear-gradient(135deg, #0a7ea4 0%, #10a5c7 50%, #0d8bb8 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .header-gradient::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 3s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .success-icon-circle {
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      margin-bottom: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      backdrop-filter: blur(10px);
    }
    .header-gradient h1 {
      font-size: 32px;
      font-weight: 800;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      letter-spacing: 0.5px;
    }
    .header-gradient p {
      margin-top: 10px;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .greeting strong {
      color: #0a7ea4;
      font-weight: 700;
    }
    .booking-id-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin: 30px 0;
      border: 2px solid #0a7ea4;
      box-shadow: 0 4px 12px rgba(10, 126, 164, 0.15);
    }
    .booking-id-card strong {
      color: #0a7ea4;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
    }
    .section {
      margin: 30px 0;
      background: #f8fafc;
      border-radius: 12px;
      padding: 25px;
      border-left: 5px solid #0a7ea4;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .section-title {
      color: #0a7ea4;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title-icon {
      font-size: 24px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-weight: 500;
      font-size: 15px;
    }
    .info-value {
      color: #111827;
      font-weight: 600;
      font-size: 15px;
      text-align: right;
      max-width: 60%;
    }
    .price-section {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      border: 2px solid #0a7ea4;
      box-shadow: 0 4px 16px rgba(10, 126, 164, 0.1);
    }
    .price-section-title {
      font-size: 20px;
      font-weight: 700;
      color: #0a7ea4;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      font-size: 15px;
    }
    .total-price-row {
      margin-top: 15px;
      padding-top: 20px;
      border-top: 3px solid #0a7ea4;
      font-size: 24px;
      font-weight: 800;
      color: #f97316;
    }
    .discount {
      color: #10b981;
      font-weight: 700;
    }
    .payment-status-section {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
      border: 2px solid #10b981;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
    }
    .payment-status-title {
      font-size: 18px;
      font-weight: 700;
      color: #059669;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .payment-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .status-paid {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .notes-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
    }
    .notes-title {
      font-size: 18px;
      font-weight: 700;
      color: #d97706;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .notes-list {
      list-style: none;
      padding: 0;
    }
    .notes-list li {
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
      color: #78350f;
      font-size: 15px;
      line-height: 1.6;
    }
    .notes-list li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #f59e0b;
      font-weight: bold;
      font-size: 18px;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer strong {
      color: #0a7ea4;
      font-weight: 700;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }
      .header-gradient {
        padding: 30px 20px;
      }
      .header-gradient h1 {
        font-size: 24px;
      }
      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 5px;
      }
      .info-value {
        max-width: 100%;
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header-gradient">
      <div class="success-icon-circle">✅</div>
      <h1>Đặt Phòng Thành Công!</h1>
      <p>Thanh toán đã được xác nhận</p>
    </div>

    <div class="content">
      <div class="greeting">
        Xin chào <strong>${guestName}</strong>,<br>
        Cảm ơn bạn đã đặt phòng tại hệ thống Smart Homestay. Đơn đặt phòng của bạn đã được xác nhận và thanh toán thành công!
      </div>

      <div class="booking-id-card">
        <strong>Mã đơn hàng: #${bookingId.slice(-8).toUpperCase()}</strong>
      </div>

      <div class="section">
        <div class="section-title">
          <span class="section-title-icon">🏠</span>
          Thông Tin Homestay
        </div>
        <div class="info-row">
          <span class="info-label">Tên homestay:</span>
          <span class="info-value">${homestayName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Địa chỉ:</span>
          <span class="info-value">${address}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <span class="section-title-icon">🛏️</span>
          Thông Tin Phòng
        </div>
        <div class="info-row">
          <span class="info-label">Tên phòng:</span>
          <span class="info-value">${roomName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Số khách:</span>
          <span class="info-value">${numberOfGuests} khách</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <span class="section-title-icon">📅</span>
          Thông Tin Ngày
        </div>
        <div class="info-row">
          <span class="info-label">Ngày nhận phòng:</span>
          <span class="info-value">${formatDate(checkIn)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ngày trả phòng:</span>
          <span class="info-value">${formatDate(checkOut)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Số đêm:</span>
          <span class="info-value">${numberOfNights} đêm</span>
        </div>
      </div>

      <div class="price-section">
        <div class="price-section-title">
          <span>💰</span>
          Tóm Tắt Thanh Toán
        </div>
        ${originalPrice && originalPrice !== totalPrice ? `
        <div class="price-row">
          <span>Tổng giá gốc:</span>
          <span>${formatPrice(originalPrice)} VNĐ</span>
        </div>
        ` : ''}
        ${discountAmount && discountAmount > 0 ? `
        <div class="price-row">
          <span>Giảm giá ${couponCode ? `(${couponCode})` : ''}:</span>
          <span class="discount">-${formatPrice(discountAmount)} VNĐ</span>
        </div>
        ` : ''}
        <div class="price-row total-price-row">
          <span>Tổng cộng:</span>
          <span>${formatPrice(totalPrice)} VNĐ</span>
        </div>
      </div>

      <div class="payment-status-section">
        <div class="payment-status-title">
          <span>💳</span>
          Thông Tin Thanh Toán
        </div>
        <div class="payment-info-row">
          <span style="color: #059669; font-weight: 600;">Phương thức:</span>
          <span style="color: #111827; font-weight: 600;">${paymentMethodText}</span>
        </div>
        <div class="payment-info-row">
          <span style="color: #059669; font-weight: 600;">Trạng thái:</span>
          <span class="status-badge status-paid">
            <span>✓</span>
            ${paymentStatusText}
          </span>
        </div>
      </div>

      <div class="notes-box">
        <div class="notes-title">
          <span>📌</span>
          Lưu ý quan trọng
        </div>
        <ul class="notes-list">
          <li>Vui lòng đến đúng thời gian check-in đã đặt</li>
          <li>Mang theo giấy tờ tùy thân khi check-in</li>
          <li>Nếu có thay đổi, vui lòng liên hệ với chủ homestay sớm nhất có thể</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
      <p><strong>Smart Homestay System</strong></p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Gửi email xác nhận đặt phòng
  async sendBookingConfirmation(booking, userEmail) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email service: Chưa cấu hình email, bỏ qua việc gửi email');
        return { success: false, message: 'Chưa cấu hình email service' };
      }

      // Populate thông tin nếu chưa có
      let homestay = booking.homestay;
      let room = booking.room;
      let guest = booking.guest;

      if (typeof homestay === 'string' || !homestay) {
        const Homestay = require('../models/Homestay');
        homestay = await Homestay.findById(booking.homestay).select('name address');
      }

      if (typeof room === 'string' || !room) {
        const Room = require('../models/Room');
        room = await Room.findById(booking.room).select('name type pricePerNight');
      }

      if (typeof guest === 'string' || !guest) {
        const User = require('../models/User');
        guest = await User.findById(booking.guest).select('username email');
      }

      // Format địa chỉ
      const address = homestay?.address 
        ? [
            homestay.address.street || '',
            homestay.address.ward?.name,
            homestay.address.district?.name,
            homestay.address.province?.name
          ].filter(Boolean).join(', ')
        : 'Chưa cập nhật';

      // Tính số đêm
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const numberOfNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

      // Tạo template email
      const emailHtml = this.createBookingConfirmationTemplate({
        bookingId: booking._id.toString(),
        guestName: guest?.username || booking.guestInfo?.fullName || 'Khách hàng',
        homestayName: homestay?.name || 'Chưa có tên',
        roomName: room?.name || 'Chưa có tên',
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        numberOfGuests: booking.numberOfGuests,
        numberOfNights: numberOfNights,
        totalPrice: booking.totalPrice,
        originalPrice: booking.originalPrice,
        discountAmount: booking.discountAmount,
        couponCode: booking.couponCode,
        address: address,
        paymentMethod: booking.paymentMethod,
        paymentStatus: booking.paymentStatus
      });

      // Gửi email
      const mailOptions = {
        from: `"Smart Homestay" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `✅ Xác nhận đặt phòng thành công - Mã đơn: #${booking._id.toString().slice(-8).toUpperCase()}`,
        html: emailHtml,
        text: `Xác nhận đặt phòng thành công. Mã đơn: #${booking._id.toString().slice(-8).toUpperCase()}`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email đã được gửi thành công:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId,
        message: 'Email đã được gửi thành công'
      };
    } catch (error) {
      console.error('Lỗi gửi email:', error);
      // Không throw error để không ảnh hưởng đến flow tạo booking
      return { 
        success: false, 
        error: error.message,
        message: 'Không thể gửi email, nhưng booking đã được tạo thành công'
      };
    }
  }

  // Tạo template email xác thực OTP
  createOTPEmailTemplate(otpCode, username) {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực đăng ký</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header-gradient {
      background: linear-gradient(135deg, #0a7ea4 0%, #10a5c7 50%, #0d8bb8 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .header-gradient h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      letter-spacing: 0.5px;
    }
    .header-gradient p {
      margin-top: 10px;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .greeting strong {
      color: #0a7ea4;
      font-weight: 700;
    }
    .otp-container {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      margin: 30px 0;
      border: 3px solid #0a7ea4;
      box-shadow: 0 4px 16px rgba(10, 126, 164, 0.15);
    }
    .otp-label {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .otp-code {
      font-size: 48px;
      font-weight: 800;
      color: #0a7ea4;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 20px 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .warning-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
    }
    .warning-title {
      font-size: 16px;
      font-weight: 700;
      color: #d97706;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warning-text {
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
    }
    .expiry-info {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      color: #6b7280;
      font-size: 14px;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer strong {
      color: #0a7ea4;
      font-weight: 700;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }
      .header-gradient {
        padding: 30px 20px;
      }
      .header-gradient h1 {
        font-size: 24px;
      }
      .otp-code {
        font-size: 36px;
        letter-spacing: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header-gradient">
      <h1>🔐 Mã Xác Thực Đăng Ký</h1>
      <p>Smart Homestay System</p>
    </div>

    <div class="content">
      <div class="greeting">
        Xin chào <strong>${username}</strong>,<br>
        Cảm ơn bạn đã đăng ký tài khoản tại Smart Homestay System!
      </div>

      <div class="otp-container">
        <div class="otp-label">Mã xác thực của bạn là:</div>
        <div class="otp-code">${otpCode}</div>
        <div class="expiry-info">
          ⏰ Mã này có hiệu lực trong <strong>10 phút</strong>
        </div>
      </div>

      <div class="warning-box">
        <div class="warning-title">
          <span>⚠️</span>
          Lưu ý bảo mật
        </div>
        <div class="warning-text">
          • Không chia sẻ mã này với bất kỳ ai<br>
          • Mã xác thực chỉ có hiệu lực trong 10 phút<br>
          • Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
      <p><strong>Smart Homestay System</strong></p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Gửi email OTP
  async sendOTPEmail(email, otpCode, username) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email service: Chưa cấu hình email, không thể gửi OTP');
        return { 
          success: false, 
          message: 'Chưa cấu hình email service. Vui lòng liên hệ quản trị viên.' 
        };
      }

      // Tạo template email
      const emailHtml = this.createOTPEmailTemplate(otpCode, username);

      // Gửi email
      const mailOptions = {
        from: `"Smart Homestay" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🔐 Mã xác thực đăng ký - ${otpCode}`,
        html: emailHtml,
        text: `Mã xác thực đăng ký của bạn là: ${otpCode}. Mã này có hiệu lực trong 10 phút.`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId,
        message: 'Email xác thực đã được gửi thành công'
      };
    } catch (error) {
      console.error('Lỗi gửi email OTP:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.'
      };
    }
  }

  // Tạo template email reset password OTP
  createPasswordResetOTPTemplate(otpCode, username) {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực đặt lại mật khẩu</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header-gradient {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .header-gradient h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      letter-spacing: 0.5px;
    }
    .header-gradient p {
      margin-top: 10px;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .greeting strong {
      color: #dc2626;
      font-weight: 700;
    }
    .otp-container {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      margin: 30px 0;
      border: 3px solid #dc2626;
      box-shadow: 0 4px 16px rgba(220, 38, 38, 0.15);
    }
    .otp-label {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .otp-code {
      font-size: 48px;
      font-weight: 800;
      color: #dc2626;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 20px 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .warning-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
    }
    .warning-title {
      font-size: 16px;
      font-weight: 700;
      color: #d97706;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warning-text {
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
    }
    .expiry-info {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      color: #6b7280;
      font-size: 14px;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer strong {
      color: #dc2626;
      font-weight: 700;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }
      .header-gradient {
        padding: 30px 20px;
      }
      .header-gradient h1 {
        font-size: 24px;
      }
      .otp-code {
        font-size: 36px;
        letter-spacing: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header-gradient">
      <h1>🔒 Đặt Lại Mật Khẩu</h1>
      <p>Smart Homestay System</p>
    </div>

    <div class="content">
      <div class="greeting">
        Xin chào <strong>${username}</strong>,<br>
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
      </div>

      <div class="otp-container">
        <div class="otp-label">Mã xác thực của bạn là:</div>
        <div class="otp-code">${otpCode}</div>
        <div class="expiry-info">
          ⏰ Mã này có hiệu lực trong <strong>10 phút</strong>
        </div>
      </div>

      <div class="warning-box">
        <div class="warning-title">
          <span>⚠️</span>
          Lưu ý bảo mật
        </div>
        <div class="warning-text">
          • Không chia sẻ mã này với bất kỳ ai<br>
          • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này<br>
          • Mã xác thực chỉ có hiệu lực trong 10 phút<br>
          • Sau khi đặt lại mật khẩu, hãy đăng nhập ngay để đảm bảo an toàn
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
      <p><strong>Smart Homestay System</strong></p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Gửi email OTP reset password
  async sendPasswordResetOTP(email, otpCode, username) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email service: Chưa cấu hình email, không thể gửi OTP');
        return { 
          success: false, 
          message: 'Chưa cấu hình email service. Vui lòng liên hệ quản trị viên.' 
        };
      }

      // Tạo template email
      const emailHtml = this.createPasswordResetOTPTemplate(otpCode, username);

      // Gửi email
      const mailOptions = {
        from: `"Smart Homestay" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🔒 Mã xác thực đặt lại mật khẩu - ${otpCode}`,
        html: emailHtml,
        text: `Mã xác thực đặt lại mật khẩu của bạn là: ${otpCode}. Mã này có hiệu lực trong 10 phút.`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset OTP email sent successfully:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId,
        message: 'Email xác thực đã được gửi thành công'
      };
    } catch (error) {
      console.error('Lỗi gửi email OTP reset password:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.'
      };
    }
  }

  // Tạo template email change OTP
  createEmailChangeOTPTemplate(otpCode, username, newEmail) {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực thay đổi email</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header-gradient {
      background: linear-gradient(135deg, #0a7ea4 0%, #10a5c7 50%, #0d8bb8 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .header-gradient h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      letter-spacing: 0.5px;
    }
    .header-gradient p {
      margin-top: 10px;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .greeting strong {
      color: #0a7ea4;
      font-weight: 700;
    }
    .email-info {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
      border-left: 4px solid #0a7ea4;
    }
    .email-info strong {
      color: #0a7ea4;
    }
    .otp-container {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      margin: 30px 0;
      border: 3px solid #0a7ea4;
      box-shadow: 0 4px 16px rgba(10, 126, 164, 0.15);
    }
    .otp-label {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .otp-code {
      font-size: 48px;
      font-weight: 800;
      color: #0a7ea4;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 20px 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .warning-box {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      padding: 20px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
    }
    .warning-title {
      font-size: 16px;
      font-weight: 700;
      color: #d97706;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warning-text {
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
    }
    .expiry-info {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      color: #6b7280;
      font-size: 14px;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer strong {
      color: #0a7ea4;
      font-weight: 700;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }
      .header-gradient {
        padding: 30px 20px;
      }
      .header-gradient h1 {
        font-size: 24px;
      }
      .otp-code {
        font-size: 36px;
        letter-spacing: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header-gradient">
      <h1>📧 Xác Thực Email Mới</h1>
      <p>Smart Homestay System</p>
    </div>

    <div class="content">
      <div class="greeting">
        Xin chào <strong>${username}</strong>,<br>
        Bạn đã yêu cầu thay đổi email của tài khoản.
      </div>

      <div class="email-info">
        <p>Email mới: <strong>${newEmail}</strong></p>
      </div>

      <div class="otp-container">
        <div class="otp-label">Mã xác thực của bạn là:</div>
        <div class="otp-code">${otpCode}</div>
        <div class="expiry-info">
          ⏰ Mã này có hiệu lực trong <strong>10 phút</strong>
        </div>
      </div>

      <div class="warning-box">
        <div class="warning-title">
          <span>⚠️</span>
          Lưu ý bảo mật
        </div>
        <div class="warning-text">
          • Không chia sẻ mã này với bất kỳ ai<br>
          • Nếu bạn không yêu cầu thay đổi email, vui lòng bỏ qua email này<br>
          • Mã xác thực chỉ có hiệu lực trong 10 phút<br>
          • Sau khi xác thực, email của bạn sẽ được thay đổi
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
      <p><strong>Smart Homestay System</strong></p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Gửi email OTP cho email change
  async sendEmailChangeOTP(email, otpCode, username, newEmail) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email service: Chưa cấu hình email, không thể gửi OTP');
        return { 
          success: false, 
          message: 'Chưa cấu hình email service. Vui lòng liên hệ quản trị viên.' 
        };
      }

      // Tạo template email
      const emailHtml = this.createEmailChangeOTPTemplate(otpCode, username, newEmail);

      // Gửi email
      const mailOptions = {
        from: `"Smart Homestay" <${process.env.EMAIL_USER}>`,
        to: newEmail, // Gửi đến email mới
        subject: `📧 Mã xác thực thay đổi email - ${otpCode}`,
        html: emailHtml,
        text: `Mã xác thực thay đổi email của bạn là: ${otpCode}. Email mới: ${newEmail}. Mã này có hiệu lực trong 10 phút.`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email change OTP email sent successfully:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId,
        message: 'Email xác thực đã được gửi thành công đến email mới'
      };
    } catch (error) {
      console.error('Lỗi gửi email OTP email change:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.'
      };
    }
  }

  // Tạo template email phản hồi khiếu nại
  createComplaintResponseTemplate(complaintData) {
    const {
      complaintTitle,
      complaintType,
      username,
      status,
      adminResponse,
      adminName,
      respondedAt
    } = complaintData;

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusInfo = (status) => {
      switch (status) {
        case 'resolved':
          return {
            text: 'Đã giải quyết',
            color: '#10b981',
            icon: '✅',
            bgColor: '#d1fae5'
          };
        case 'in_progress':
          return {
            text: 'Đang xử lý',
            color: '#f59e0b',
            icon: '⏳',
            bgColor: '#fef3c7'
          };
        case 'rejected':
          return {
            text: 'Đã từ chối',
            color: '#ef4444',
            icon: '❌',
            bgColor: '#fee2e2'
          };
        default:
          return {
            text: 'Đang chờ',
            color: '#6b7280',
            icon: '📋',
            bgColor: '#f3f4f6'
          };
      }
    };

    const statusInfo = getStatusInfo(status);
    const typeLabels = {
      homestay: 'Khiếu nại về Homestay',
      booking: 'Khiếu nại về Đặt phòng',
      payment: 'Khiếu nại về Thanh toán',
      service: 'Khiếu nại về Dịch vụ',
      host: 'Khiếu nại về Chủ nhà',
      other: 'Khiếu nại khác'
    };

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phản hồi khiếu nại</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header-gradient {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .header-gradient h1 {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      letter-spacing: 0.5px;
    }
    .header-gradient p {
      margin-top: 10px;
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #374151;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .greeting strong {
      color: #ef4444;
      font-weight: 700;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin: 20px 0;
    }
    .complaint-info-box {
      background: #f8fafc;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
      border-left: 5px solid #ef4444;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #6b7280;
      font-weight: 600;
      font-size: 15px;
      min-width: 150px;
    }
    .info-value {
      color: #111827;
      font-weight: 500;
      font-size: 15px;
      text-align: right;
      flex: 1;
    }
    .response-box {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 30px;
      border-radius: 12px;
      margin: 30px 0;
      border: 2px solid #0a7ea4;
      box-shadow: 0 4px 16px rgba(10, 126, 164, 0.1);
    }
    .response-title {
      font-size: 20px;
      font-weight: 700;
      color: #0a7ea4;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .response-content {
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
      color: #374151;
      font-size: 15px;
      line-height: 1.8;
      white-space: pre-wrap;
      border: 1px solid #e5e7eb;
    }
    .admin-info {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #0a7ea4;
      font-size: 13px;
      color: #6b7280;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer strong {
      color: #ef4444;
      font-weight: 700;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 25px 20px;
      }
      .header-gradient {
        padding: 30px 20px;
      }
      .header-gradient h1 {
        font-size: 24px;
      }
      .info-row {
        flex-direction: column;
        gap: 5px;
      }
      .info-value {
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header-gradient">
      <h1>📝 Phản Hồi Khiếu Nại</h1>
      <p>Smart Homestay System</p>
    </div>

    <div class="content">
      <div class="greeting">
        Xin chào <strong>${username}</strong>,<br>
        Chúng tôi đã xem xét và xử lý khiếu nại của bạn.
      </div>

      <div class="complaint-info-box">
        <div class="info-row">
          <span class="info-label">Tiêu đề khiếu nại:</span>
          <span class="info-value">${complaintTitle}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Loại khiếu nại:</span>
          <span class="info-value">${typeLabels[complaintType] || complaintType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Trạng thái:</span>
          <span class="info-value">
            <span class="status-badge" style="background: ${statusInfo.bgColor}; color: ${statusInfo.color};">
              ${statusInfo.icon} ${statusInfo.text}
            </span>
          </span>
        </div>
      </div>

      ${adminResponse ? `
      <div class="response-box">
        <div class="response-title">
          <span>💬</span>
          Phản Hồi Từ Ban Quản Trị
        </div>
        <div class="response-content">
${adminResponse}
        </div>
        <div class="admin-info">
          <p>Phản hồi bởi: <strong>${adminName}</strong></p>
          <p>Thời gian: ${formatDate(respondedAt)}</p>
        </div>
      </div>
      ` : ''}

      <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 20px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #f59e0b;">
        <p style="color: #78350f; font-size: 14px; line-height: 1.6;">
          💡 <strong>Lưu ý:</strong> Nếu bạn có thắc mắc thêm về phản hồi này, vui lòng liên hệ với chúng tôi hoặc gửi khiếu nại mới qua ứng dụng.
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.</p>
      <p><strong>Smart Homestay System</strong></p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 15px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Gửi email phản hồi khiếu nại
  async sendComplaintResponseEmail(complaint, userEmail) {
    try {
      // Kiểm tra cấu hình email
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email service: Chưa cấu hình email, bỏ qua việc gửi email');
        return { success: false, message: 'Chưa cấu hình email service' };
      }

      // Populate thông tin nếu chưa có
      let user = complaint.user;
      let admin = complaint.adminResponse?.respondedBy;

      if (typeof user === 'string' || !user) {
        const User = require('../models/User');
        user = await User.findById(complaint.user).select('username email');
      }

      if (typeof admin === 'string' || admin) {
        const User = require('../models/User');
        if (complaint.adminResponse?.respondedBy) {
          admin = await User.findById(complaint.adminResponse.respondedBy).select('username email');
        }
      }

      // Tạo template email
      const emailHtml = this.createComplaintResponseTemplate({
        complaintTitle: complaint.title,
        complaintType: complaint.type,
        username: user?.username || 'Khách hàng',
        status: complaint.status,
        adminResponse: complaint.adminResponse?.response || null,
        adminName: admin?.username || 'Ban quản trị',
        respondedAt: complaint.adminResponse?.respondedAt || new Date()
      });

      const statusText = complaint.status === 'resolved' ? 'Đã giải quyết' :
                        complaint.status === 'in_progress' ? 'Đang xử lý' :
                        complaint.status === 'rejected' ? 'Đã từ chối' : 'Đang chờ';

      // Gửi email
      const mailOptions = {
        from: `"Smart Homestay" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `📝 Phản hồi khiếu nại: ${complaint.title} - ${statusText}`,
        html: emailHtml,
        text: `Khiếu nại của bạn đã được cập nhật: ${statusText}. ${complaint.adminResponse?.response ? `Phản hồi: ${complaint.adminResponse.response}` : ''}`
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Complaint response email sent successfully:', info.messageId);
      
      return { 
        success: true, 
        messageId: info.messageId,
        message: 'Email phản hồi đã được gửi thành công'
      };
    } catch (error) {
      console.error('Lỗi gửi email phản hồi khiếu nại:', error);
      // Không throw error để không ảnh hưởng đến flow cập nhật
      return { 
        success: false, 
        error: error.message,
        message: 'Không thể gửi email, nhưng khiếu nại đã được cập nhật thành công'
      };
    }
  }
}

module.exports = new EmailService();

