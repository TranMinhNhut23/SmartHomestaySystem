# ⚡ Khắc Phục Lỗi "Network Request Failed" - QUICK FIX

## 🔴 Lỗi Bạn Đang Gặp:
```
ERROR  Error fetching wallet: [TypeError: Network request failed]
ERROR  Error creating MoMo deposit: [TypeError: Network request failed]
```

---

## ✅ Giải Pháp Nhanh (3 Bước)

### **Bước 1: Đảm bảo Backend đang chạy**

```bash
# Mở terminal mới, vào thư mục backend
cd backend

# Chạy backend server
npm start

# Nếu thành công, bạn sẽ thấy:
# Server đang chạy tại port 5000
# MongoDB connected successfully
```

### **Bước 2: Tạo file .env cho Frontend**

```bash
# Tạo file frontend/.env với nội dung:

# Cho Android Emulator:
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# Cho iOS Simulator:
# EXPO_PUBLIC_API_URL=http://localhost:5000

# Cho điện thoại thật (thay YOUR_IP):
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

**Windows - Tìm IP:**
```bash
ipconfig
# Tìm "IPv4 Address" trong phần Wi-Fi
```

**Mac/Linux - Tìm IP:**
```bash
ifconfig | grep "inet "
```

### **Bước 3: Restart Expo Server**

```bash
# Stop Expo server (Ctrl+C)

# Clear cache và start lại
cd frontend
npx expo start -c

# Nhấn 'a' cho Android hoặc 'i' cho iOS
```

---

## 🎯 Kiểm Tra

Sau khi restart, check console log. Bạn sẽ thấy:

```
=== API Service Initialized ===
Platform: android
API_BASE_URL: http://10.0.2.2:5000/api
BASE_URL: http://10.0.2.2:5000
==============================

Fetching wallet from: http://10.0.2.2:5000/api/wallet
Wallet response status: 200
```

✅ **Nếu thấy status 200** → Thành công!

❌ **Nếu vẫn lỗi** → Xem phần Troubleshooting bên dưới

---

## 🔧 Troubleshooting

### **Lỗi 1: Backend chưa chạy**

```bash
# Kiểm tra backend
curl http://localhost:5000

# Nếu lỗi → Backend chưa chạy
# Vào thư mục backend và chạy:
npm start
```

### **Lỗi 2: Android emulator không kết nối được**

**Thử port forwarding:**
```bash
adb reverse tcp:5000 tcp:5000
```

Sau đó dùng:
```
EXPO_PUBLIC_API_URL=http://localhost:5000
```

### **Lỗi 3: Firewall block**

**Windows:**
- Control Panel → Windows Defender Firewall
- Turn off hoặc allow port 5000

**Mac:**
- System Preferences → Security & Privacy → Firewall
- Firewall Options → Allow Node

### **Lỗi 4: MongoDB chưa kết nối**

```bash
# Check MongoDB
# Backend console phải có:
MongoDB connected successfully

# Nếu không → Check .env backend:
MONGODB_URI=mongodb://localhost:27017/smart-homestay

# Hoặc start MongoDB:
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
```

---

## 📝 Checklist

Trước khi test lại, đảm bảo:

- [ ] Backend đang chạy (port 5000)
- [ ] MongoDB đã kết nối
- [ ] File `.env` frontend đã tạo với API_URL đúng
- [ ] Đã restart Expo server (`expo start -c`)
- [ ] Firewall không block port 5000
- [ ] (Real device) Cùng WiFi với máy tính

---

## 🚀 Test Ngay

**Test 1: Health Check**
```bash
# Mở browser hoặc dùng curl:
curl http://localhost:5000

# Phải trả về:
{"success":true,"message":"API đang hoạt động"}
```

**Test 2: Wallet Endpoint**
```bash
# Thay YOUR_TOKEN bằng token thật
curl http://localhost:5000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test 3: Trong App**
- Đăng nhập
- Vào trang "Tài Khoản"
- Scroll xuống phần Ví
- Nếu thấy số dư → Thành công!

---

## 💡 Tips

### **Dùng Android Emulator:**
✅ Luôn dùng `http://10.0.2.2:5000` thay vì `localhost`

### **Dùng iOS Simulator:**
✅ Dùng `http://localhost:5000` OK

### **Dùng Điện thoại thật:**
✅ Dùng IP máy tính: `http://192.168.1.100:5000`
✅ Đảm bảo cùng WiFi
✅ Tắt VPN

---

## 📞 Vẫn Không Được?

### **Debug Mode:**

Thêm vào `frontend/contexts/WalletContext.tsx` (đã có sẵn):
```typescript
console.log('Fetching wallet from:', `${API_URL}/api/wallet`);
```

Check Metro console để xem API_URL nào được dùng.

### **Backend Logs:**

Check terminal backend để xem có request đến không:
```
2024-01-01T10:00:00.000Z - GET /api/wallet
Query params: {}
```

Nếu không thấy → Frontend không kết nối được backend

Nếu thấy nhưng lỗi → Check authentication/database

---

## 🎉 Hoàn Tất!

Sau khi làm theo 3 bước trên:
1. ✅ Backend chạy
2. ✅ .env đúng
3. ✅ Restart Expo

→ Hệ thống ví sẽ hoạt động ngay! 💰

---

## 📚 Đọc Thêm

- Chi tiết về network setup: `NETWORK_SETUP_GUIDE.md`
- Chi tiết về wallet features: `WALLET_FEATURES.md`

**Happy Coding! 🚀**


