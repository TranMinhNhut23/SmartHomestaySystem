# Hướng dẫn khắc phục lỗi Network Request Failed

## Lỗi "Network request failed" khi đăng ký/đăng nhập

### Nguyên nhân thường gặp:

1. **Backend chưa chạy**
2. **localhost không hoạt động trên thiết bị thật**
3. **CORS hoặc firewall chặn**

## Cách khắc phục:

### 1. Kiểm tra Backend đang chạy

```bash
cd backend
npm start
```

Bạn sẽ thấy: `Server đang chạy tại port 5000`

### 2. Kiểm tra Backend hoạt động

Mở trình duyệt và truy cập: `http://localhost:5000`

Bạn sẽ thấy: `{"success":true,"message":"API đang hoạt động"}`

### 3. Nếu dùng thiết bị thật (Android/iOS)

**Vấn đề:** `localhost` chỉ hoạt động trên máy tính, không hoạt động trên thiết bị thật.

**Giải pháp:** Thay `localhost` bằng IP máy tính của bạn.

#### Cách tìm IP máy tính:

**Windows:**
```bash
ipconfig
```
Tìm `IPv4 Address` (ví dụ: `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
```
Tìm `inet` trong phần `en0` hoặc `wlan0`

#### Cập nhật API URL:

1. Tạo file `.env` trong thư mục `frontend`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api
```
(Thay `192.168.1.100` bằng IP máy tính của bạn)

2. Khởi động lại Expo:
```bash
cd frontend
npm start
```

### 4. Kiểm tra Firewall

Đảm bảo Windows Firewall không chặn port 5000.

### 5. Kiểm tra cùng mạng WiFi

Thiết bị và máy tính phải cùng một mạng WiFi.

### 6. Test API trực tiếp

Dùng Postman hoặc curl để test:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"123456"}'
```

## Debug trong Console

Mở Developer Tools (F12) và xem:
- **Console tab**: Xem lỗi chi tiết
- **Network tab**: Xem request có được gửi không và response là gì

## Lưu ý

- Nếu chạy trên **web browser**: Dùng `http://localhost:5000/api`
- Nếu chạy trên **Android/iOS device**: Dùng `http://[IP_MÁY_TÍNH]:5000/api`
- Nếu chạy trên **Android Emulator**: Dùng `http://10.0.2.2:5000/api`
- Nếu chạy trên **iOS Simulator**: Dùng `http://localhost:5000/api`













