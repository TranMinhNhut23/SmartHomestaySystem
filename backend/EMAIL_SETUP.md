# Cấu hình Email Service

Hệ thống sử dụng Nodemailer để gửi email xác nhận đặt phòng tự động.

## Cài đặt

Cài đặt package nodemailer:

```bash
npm install
```

## Cấu hình trong file .env

Thêm các biến môi trường sau vào file `.env` trong thư mục `backend`:

### Cấu hình Gmail (Khuyến nghị cho development)

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Lưu ý quan trọng cho Gmail:**
- Không sử dụng mật khẩu tài khoản Gmail thông thường
- Cần tạo **App Password** từ Google Account:
  1. Vào [Google Account Settings](https://myaccount.google.com/)
  2. Chọn **Security** → **2-Step Verification** (bật nếu chưa có)
  3. Chọn **App passwords**
  4. Tạo app password mới cho "Mail"
  5. Sử dụng app password này cho `EMAIL_PASSWORD`

### Cấu hình Email khác (Outlook, Yahoo, v.v.)

#### Outlook/Hotmail:
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### Yahoo Mail:
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

#### SMTP Server tùy chỉnh:
```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-password
```

## Cách hoạt động

1. Khi khách hàng đặt phòng thành công, hệ thống sẽ tự động:
   - Tạo booking trong database
   - Gửi email xác nhận đến email của khách hàng
   - Email chứa đầy đủ thông tin: mã đơn, homestay, phòng, ngày check-in/out, giá, v.v.

2. Email được gửi **không đồng bộ** (async), không block quá trình tạo booking
   - Nếu gửi email thất bại, booking vẫn được tạo thành công
   - Lỗi email sẽ được log ra console để debug

## Template Email

Email xác nhận đặt phòng bao gồm:
- ✅ Icon xác nhận thành công
- 📋 Mã đơn hàng
- 🏠 Thông tin homestay và địa chỉ
- 🛏️ Thông tin phòng
- 📅 Ngày check-in/check-out và số đêm
- 💰 Tóm tắt thanh toán (giá gốc, giảm giá nếu có, tổng cộng)
- 💳 Phương thức và trạng thái thanh toán
- 📌 Lưu ý quan trọng cho khách hàng

## Kiểm tra cấu hình

Khi server khởi động, hệ thống sẽ tự động kiểm tra kết nối email:
- ✅ Nếu thành công: `Email service: Kết nối email thành công`
- ❌ Nếu thất bại: `Email service: Lỗi kết nối email: [chi tiết lỗi]`

## Troubleshooting

### Lỗi "Invalid login"
- Kiểm tra lại `EMAIL_USER` và `EMAIL_PASSWORD`
- Đối với Gmail, đảm bảo đã sử dụng App Password, không phải mật khẩu thông thường

### Lỗi "Connection timeout"
- Kiểm tra firewall/antivirus có chặn kết nối SMTP không
- Thử đổi port: 587 (TLS) hoặc 465 (SSL)

### Email không được gửi nhưng không có lỗi
- Kiểm tra spam/junk folder
- Kiểm tra console log để xem có lỗi gì không
- Đảm bảo `EMAIL_USER` và `EMAIL_PASSWORD` đã được cấu hình đúng

### Email được gửi nhưng không đến
- Kiểm tra địa chỉ email người nhận có đúng không
- Kiểm tra spam folder
- Một số email provider có thể chặn email từ SMTP server không xác thực

## Production

Trong môi trường production, nên sử dụng:
- **Email service chuyên nghiệp**: SendGrid, Mailgun, AWS SES, v.v.
- **SMTP server riêng** với domain đã được xác thực
- **Rate limiting** để tránh bị spam
- **Email queue** để xử lý số lượng lớn email

Ví dụ với SendGrid:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```
































