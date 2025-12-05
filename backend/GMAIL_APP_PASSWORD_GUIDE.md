# Hướng dẫn tạo Gmail App Password

## Bước 1: Bật 2-Step Verification

1. Truy cập [Google Account Settings](https://myaccount.google.com/)
2. Chọn **Security** (Bảo mật) ở menu bên trái
3. Tìm mục **2-Step Verification** (Xác minh 2 bước)
4. Nhấn **Get started** (Bắt đầu) và làm theo hướng dẫn
5. Xác minh số điện thoại của bạn

## Bước 2: Tạo App Password

Sau khi bật 2-Step Verification:

1. Vẫn trong trang **Security**, cuộn xuống tìm **App passwords** (Mật khẩu ứng dụng)
   - Hoặc truy cập trực tiếp: https://myaccount.google.com/apppasswords

2. Nếu chưa thấy "App passwords":
   - Đảm bảo đã bật **2-Step Verification**
   - Có thể cần đăng nhập lại

3. Tạo App Password mới:
   - Chọn **Select app**: Chọn "Mail"
   - Chọn **Select device**: Chọn "Other (Custom name)"
   - Nhập tên: "Smart Homestay System" hoặc tên bất kỳ
   - Nhấn **Generate** (Tạo)

4. Google sẽ hiển thị mật khẩu 16 ký tự:
   ```
   xxxx xxxx xxxx xxxx
   ```
   **QUAN TRỌNG**: Loại bỏ TẤT CẢ khoảng trắng khi copy vào file `.env`

## Bước 3: Cấu hình trong file .env

Mở file `backend/.env` và cập nhật:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=nhuttranminh23@gmail.com
EMAIL_PASSWORD=xxxxxxxxxxxxxxxx
```

**Lưu ý:**
- ✅ Loại bỏ TẤT CẢ khoảng trắng trong App Password
- ✅ Không có dấu ngoặc kép
- ✅ Không có khoảng trắng trước/sau dấu `=`

## Ví dụ:

❌ **SAI:**
```env
EMAIL_PASSWORD=mbpv kbxx bgtm nktb
EMAIL_PASSWORD="mbpvkbxxbgtmnktb"
EMAIL_PASSWORD = mbpvkbxxbgtmnktb
```

✅ **ĐÚNG:**
```env
EMAIL_PASSWORD=mbpvkbxxbgtmnktb
```

## Kiểm tra

Sau khi cập nhật, khởi động lại server:

```bash
npm run dev
```

Bạn sẽ thấy:
- ✅ `Email service: Kết nối email thành công` - Nếu đúng
- ❌ `Lỗi kết nối email` - Nếu vẫn sai, kiểm tra lại các bước trên

## Troubleshooting

### Lỗi "Invalid login" vẫn còn:
1. ✅ Đảm bảo đã bật 2-Step Verification
2. ✅ Đảm bảo đã loại bỏ TẤT CẢ khoảng trắng trong password
3. ✅ Tạo App Password mới nếu cần
4. ✅ Kiểm tra email có đúng không (không có khoảng trắng)

### Không thấy "App passwords":
- Đảm bảo đã bật 2-Step Verification
- Thử đăng xuất và đăng nhập lại Google Account
- Một số tài khoản Google Workspace có thể không có tính năng này

### Vẫn không hoạt động:
- Thử tạo App Password mới
- Kiểm tra xem có bật "Less secure app access" không (không cần thiết nếu dùng App Password)
- Thử dùng email service khác (SendGrid, Mailgun) cho production























