# 📝 Hướng Dẫn Tạo File .env

## 🎯 Vấn Đề Hiện Tại

Bạn đang gặp lỗi vì:
1. URL bị duplicate `/api`: `https://192.168.2.16:5000/api/api/wallet`
2. Dùng HTTPS thay vì HTTP (backend chỉ hỗ trợ HTTP)

## ✅ Giải Pháp

### **Bước 1: Tạo file .env đúng**

Tạo file `frontend/.env` với nội dung:

```env
# QUAN TRỌNG: Dùng http:// KHÔNG phải https://
# KHÔNG thêm /api ở cuối

# Cho Android Emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# Cho iOS Simulator:
# EXPO_PUBLIC_API_URL=http://localhost:5000

# Cho Điện thoại thật (thay IP của bạn):
# EXPO_PUBLIC_API_URL=http://192.168.2.16:5000
```

### **Bước 2: Xóa file .env cũ (nếu có)**

```bash
# Trong thư mục frontend/
rm .env  # Mac/Linux
del .env # Windows
```

### **Bước 3: Tạo lại .env đúng**

**Cách 1: Dùng lệnh (nhanh nhất)**

```bash
# Mac/Linux
echo "EXPO_PUBLIC_API_URL=http://192.168.2.16:5000" > frontend/.env

# Windows PowerShell
"EXPO_PUBLIC_API_URL=http://192.168.2.16:5000" | Out-File -FilePath frontend/.env -Encoding UTF8

# Windows CMD
echo EXPO_PUBLIC_API_URL=http://192.168.2.16:5000 > frontend\.env
```

**Cách 2: Tạo bằng tay**

1. Mở VS Code
2. Tạo file mới: `frontend/.env`
3. Copy paste:
```
EXPO_PUBLIC_API_URL=http://192.168.2.16:5000
```
4. Save (Ctrl+S)

### **Bước 4: Restart Expo**

```bash
# Stop Expo server (Ctrl+C)

# Clear cache và restart
cd frontend
npx expo start -c

# Nhấn 'a' để reload Android
```

---

## 🔍 Kiểm Tra

Sau khi restart, check Metro console:

```
=== API Service Initialized ===
Platform: android
API_BASE_URL: http://192.168.2.16:5000/api ✅
BASE_URL: http://192.168.2.16:5000 ✅

=== Wallet Context Initialized ===
API_URL: http://192.168.2.16:5000 ✅

Fetching wallet from: http://192.168.2.16:5000/api/wallet ✅
                       ^^^^^                            ^^^^^
                       HTTP (không phải HTTPS)          Không duplicate /api
```

---

## ❌ Các Lỗi Thường Gặp

### **Lỗi 1: Dùng HTTPS thay vì HTTP**

```env
# SAI ❌
EXPO_PUBLIC_API_URL=https://192.168.2.16:5000

# ĐÚNG ✅
EXPO_PUBLIC_API_URL=http://192.168.2.16:5000
```

### **Lỗi 2: Thêm /api vào cuối**

```env
# SAI ❌
EXPO_PUBLIC_API_URL=http://192.168.2.16:5000/api

# ĐÚNG ✅
EXPO_PUBLIC_API_URL=http://192.168.2.16:5000
```

### **Lỗi 3: Có dấu cách thừa**

```env
# SAI ❌
EXPO_PUBLIC_API_URL = http://192.168.2.16:5000

# ĐÚNG ✅
EXPO_PUBLIC_API_URL=http://192.168.2.16:5000
```

### **Lỗi 4: Quên restart Expo**

Sau khi sửa .env **BẮT BUỘC** phải restart với flag `-c`:
```bash
npx expo start -c
```

---

## 📋 Checklist

Trước khi test, đảm bảo:

- [ ] File `.env` tồn tại trong thư mục `frontend/`
- [ ] URL bắt đầu bằng `http://` (không phải `https://`)
- [ ] URL **KHÔNG** có `/api` ở cuối
- [ ] Không có dấu cách thừa
- [ ] Đã restart Expo với `-c` flag
- [ ] Backend đang chạy
- [ ] Điện thoại và máy tính cùng WiFi

---

## 🎯 Template cho các trường hợp

### **Android Emulator**
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

### **iOS Simulator**
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

### **Điện thoại thật - Cùng WiFi**

Tìm IP máy tính:

**Windows:**
```bash
ipconfig
# Tìm "IPv4 Address" ở phần Wi-Fi
# VD: 192.168.2.16
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# Hoặc
ip addr show
# VD: 192.168.2.16
```

Sau đó:
```env
EXPO_PUBLIC_API_URL=http://192.168.2.16:5000
```

---

## 🚀 Test Backend

Trước khi test app, test backend trước:

**Test 1: Health check**
```bash
curl http://192.168.2.16:5000

# Phải thấy:
{"success":true,"message":"API đang hoạt động"}
```

**Test 2: Wallet endpoint (cần token)**
```bash
curl http://192.168.2.16:5000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Nếu backend không response → Check:
1. Backend có chạy không?
2. Firewall có block port 5000 không?
3. IP address có đúng không?

---

## 💡 Debug Tips

### **Xem file .env thực tế**

```bash
# Mac/Linux
cat frontend/.env

# Windows
type frontend\.env
```

### **Kiểm tra env variables trong app**

Thêm vào `WalletContext.tsx`:
```typescript
console.log('ENV:', process.env.EXPO_PUBLIC_API_URL);
console.log('Final API_URL:', API_URL);
```

### **Check backend logs**

Khi app gọi API, backend phải log:
```
2024-01-01T10:00:00.000Z - GET /api/wallet
```

Nếu không thấy → App không connect được backend

---

## 🎉 Kết Quả Mong Đợi

Sau khi làm đúng:

```
✅ Fetching wallet from: http://192.168.2.16:5000/api/wallet
✅ Wallet response status: 200
✅ Wallet data: { balance: 0, totalDeposited: 0, ... }
```

App sẽ hiển thị:
- Thông tin ví
- Số dư
- Các nút: Nạp tiền, Lịch sử, Rút tiền

---

## 📞 Vẫn Lỗi?

Nếu làm theo tất cả bước trên mà vẫn lỗi, cung cấp:

1. Nội dung file `.env`:
```bash
cat frontend/.env
```

2. Console logs từ Metro:
```
=== API Service Initialized ===
...
```

3. Backend logs:
```
Server đang chạy tại port 5000
...
```

4. Test curl:
```bash
curl http://192.168.2.16:5000
```

**Happy Coding! 🚀**


