# Hướng dẫn sửa lỗi Google OAuth với Expo Go

## Vấn đề
Khi chạy app trong **Expo Go**, redirect URI có dạng:
```
exp://192.168.2.16:8081/--/oauth2redirect
```

URI này không hợp lệ với Google OAuth 2.0 vì:
1. Scheme `exp://` chỉ dùng cho development
2. Địa chỉ IP thay đổi theo mạng

## GIẢI PHÁP 1: Thêm Redirect URI vào Google Cloud Console ✅ (NHANH)

### Bước 1: Lấy Redirect URI hiện tại
Xem trong log app:
```
🔗 Redirect URI: exp://192.168.2.16:8081/--/oauth2redirect
```

### Bước 2: Thêm vào Google Cloud Console

1. Truy cập: https://console.cloud.google.com/apis/credentials
2. Chọn Web Client ID: `660684573821-i9sktrq6vpls0st0g8areqt3al9090f7`
3. Trong "Authorized redirect URIs", thêm **CHÍNH XÁC** URI từ log:
   ```
   exp://192.168.2.16:8081/--/oauth2redirect
   ```
4. Click **Save**
5. Đợi 2-3 phút

### Bước 3: Test lại
1. Khởi động lại app (Ctrl+C rồi `npx expo start`)
2. Đăng nhập Google
3. Thành công! ✅

### ⚠️ LƯU Ý:
- Khi thay đổi mạng WiFi, địa chỉ IP sẽ đổi → phải cập nhật lại redirect URI
- Giải pháp này CHỈ dùng cho development
- Cho production, cần build standalone app (xem Giải pháp 2)

---

## GIẢI PHÁP 2: Build Standalone App 🏗️ (TỐT NHẤT CHO PRODUCTION)

Với standalone app, bạn sẽ dùng custom scheme cố định: `com.anonymous.frontend:/oauth2redirect`

### Bước 1: Build APK

```bash
cd frontend

# Development build
npx expo run:android

# Hoặc production build (cần EAS account)
npx eas build --platform android --profile preview
```

### Bước 2: Cập nhật Google Cloud Console

1. Truy cập: https://console.cloud.google.com/apis/credentials
2. Chọn Web Client ID
3. Thêm redirect URI:
   ```
   com.anonymous.frontend:/oauth2redirect
   ```
4. Click **Save**

### Bước 3: Cài đặt và test
1. Cài APK vào điện thoại
2. Đăng nhập Google
3. Sẽ dùng custom scheme (không phụ thuộc IP)

---

## SO SÁNH 2 GIẢI PHÁP

| Tiêu chí | Expo Go | Standalone App |
|----------|---------|----------------|
| **Tốc độ** | ⚡ Nhanh (1 phút) | 🐌 Chậm (5-10 phút) |
| **Redirect URI** | `exp://IP:PORT/--/oauth2redirect` | `com.anonymous.frontend:/oauth2redirect` |
| **Ổn định** | ❌ Thay đổi theo IP | ✅ Cố định |
| **Development** | ✅ Tốt | ⚠️ Cần rebuild khi đổi code |
| **Production** | ❌ Không dùng được | ✅ Dùng được |

---

## KHUYẾN NGHỊ

### Cho Development (hiện tại):
👉 Dùng **Giải pháp 1** (Expo Go) để test nhanh

### Cho Production/Testing cuối:
👉 Dùng **Giải pháp 2** (Standalone App)

---

## Troubleshooting

### Lỗi vẫn còn sau khi thêm redirect URI?

1. **Kiểm tra URI có đúng không:**
   - URI trong log phải CHÍNH XÁC khớp với URI trong Google Console
   - Chú ý: `exp://` không có `s`, port phải đúng (8081)

2. **Đợi đủ thời gian:**
   - Google cần 2-5 phút để áp dụng thay đổi
   - Thử lại sau vài phút

3. **Clear cache:**
   ```bash
   npx expo start --clear
   ```

4. **Kiểm tra log:**
   ```
   🔗 Redirect URI: exp://192.168.2.16:8081/--/oauth2redirect
   ```
   Copy chính xác URI này vào Google Console

### IP thay đổi?

Khi thay đổi mạng WiFi:
1. Xem log để lấy IP mới
2. Cập nhật redirect URI mới trong Google Console
3. Hoặc chuyển sang build standalone app

---

## Các URI cần thêm vào Google Cloud Console

Tùy trường hợp, thêm các URI sau:

### Cho Development với Expo Go:
```
exp://192.168.2.16:8081/--/oauth2redirect
exp://localhost:8081/--/oauth2redirect
http://localhost:8081
http://localhost:19006
```

### Cho Standalone App:
```
com.anonymous.frontend:/oauth2redirect
```

### Cho Web:
```
http://localhost:8081
http://localhost:19006
https://yourdomain.com/oauth2redirect
```

---

**Lưu ý:** Đã cập nhật code để tự động phát hiện Expo Go và hiển thị warning khi cần thêm redirect URI.


