# 🌐 Hướng Dẫn Setup Network cho Development

## ❗ Vấn Đề: Network Request Failed

Nếu bạn gặp lỗi **"Network request failed"** khi chạy ứng dụng, đây là do **Android emulator không thể kết nối đến `localhost`**.

---

## 🔧 Giải Pháp

### 1. **Android Emulator**

Android emulator sử dụng địa chỉ đặc biệt để truy cập localhost của máy host:

```bash
# Thay vì: http://localhost:5000
# Sử dụng: http://10.0.2.2:5000
```

#### **Cách 1: Tạo file .env**
```bash
# Tạo file frontend/.env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

#### **Cách 2: Code đã tự động xử lý**
WalletContext đã được cập nhật để tự động sử dụng `10.0.2.2` cho Android:

```typescript
const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000'; // ✅ Android emulator
  }
  
  return 'http://localhost:5000'; // iOS simulator
};
```

---

### 2. **iOS Simulator**

iOS simulator có thể sử dụng `localhost` trực tiếp:

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000
```

---

### 3. **Real Device (Điện thoại thật)**

Khi test trên điện thoại thật, cần sử dụng **IP address của máy tính**:

#### **Bước 1: Tìm IP của máy**

**Windows:**
```bash
ipconfig
# Tìm "IPv4 Address" trong phần Wi-Fi adapter
# VD: 192.168.1.100
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# hoặc
ip addr show
# VD: 192.168.1.100
```

#### **Bước 2: Cập nhật .env**
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

#### **Bước 3: Đảm bảo cùng WiFi**
- ✅ Máy tính và điện thoại **phải cùng mạng WiFi**
- ✅ Tắt firewall hoặc allow port 5000

---

## 🚀 Setup Chi Tiết

### **Bước 1: Tạo file .env**

```bash
# Từ thư mục frontend/
cp .env.example .env
```

Hoặc tạo file mới `frontend/.env`:

```env
# Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000

# iOS Simulator
# EXPO_PUBLIC_API_URL=http://localhost:5000

# Real Device (thay YOUR_IP bằng IP thật)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

### **Bước 2: Restart Expo Dev Server**

```bash
# Stop server (Ctrl+C)
# Start lại
npm start
# hoặc
npx expo start
```

### **Bước 3: Clear Cache (nếu cần)**

```bash
# Clear Expo cache
npx expo start -c

# hoặc
npm start -- --clear
```

---

## 🧪 Kiểm Tra Kết Nối

### **Test Backend**

```bash
# Kiểm tra backend đang chạy
curl http://localhost:5000
# hoặc
curl http://10.0.2.2:5000  # Từ Android emulator
```

Hoặc mở browser:
```
http://localhost:5000
```

Nếu thấy response JSON:
```json
{
  "success": true,
  "message": "API đang hoạt động"
}
```
→ Backend OK ✅

### **Test từ Ứng Dụng**

Sau khi sửa, check log:
```bash
# Metro bundler console
LOG  Fetching wallet from: http://10.0.2.2:5000/api/wallet
LOG  Wallet response status: 200
LOG  Wallet data: {...}
```

---

## 🔍 Troubleshooting

### **Lỗi: "Network request failed"**

#### **Nguyên nhân:**
1. ❌ Backend chưa chạy
2. ❌ Sai API_URL
3. ❌ Firewall block port
4. ❌ Không cùng WiFi (real device)

#### **Giải pháp:**

**1. Kiểm tra Backend**
```bash
# Vào thư mục backend
cd backend
npm start

# Hoặc
node index.js
```

**2. Kiểm tra Port**
```bash
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000
```

**3. Test API trực tiếp**
```bash
# Test với curl
curl -X GET http://10.0.2.2:5000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Check Firewall**
```bash
# Windows: Tắt firewall tạm thời
# Control Panel → Windows Defender Firewall → Turn off

# macOS: System Preferences → Security & Privacy → Firewall
```

**5. Check WiFi (Real Device)**
```bash
# Đảm bảo máy tính và điện thoại cùng WiFi
# Ping từ điện thoại đến máy tính (dùng app Ping)
```

---

## 📱 Platform-Specific Setup

### **Android Emulator**
```typescript
// frontend/.env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000
```

**Port mapping:**
- `10.0.2.2` → localhost của máy host
- `10.0.2.15` → IP của emulator
- `10.0.2.3` → DNS server

### **iOS Simulator**
```typescript
// frontend/.env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

iOS simulator share network với macOS, nên localhost hoạt động bình thường.

### **Real Device**
```typescript
// frontend/.env
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000
```

**Lưu ý:**
- Phải cùng WiFi
- Tắt VPN trên cả 2 thiết bị
- Allow port 5000 trong firewall

---

## 🛠️ Advanced: Port Forwarding (Android)

Nếu `10.0.2.2` không hoạt động, dùng adb port forwarding:

```bash
# Forward port từ emulator đến localhost
adb reverse tcp:5000 tcp:5000

# Sau đó dùng
EXPO_PUBLIC_API_URL=http://localhost:5000
```

---

## ✅ Checklist

### **Backend:**
- [ ] Backend server đang chạy (`npm start` trong thư mục backend)
- [ ] Backend listen trên port 5000
- [ ] Test API bằng curl/Postman thành công
- [ ] Database connected

### **Frontend:**
- [ ] File `.env` đã tạo với API_URL đúng
- [ ] Restart Expo dev server sau khi tạo .env
- [ ] Clear cache nếu cần (`expo start -c`)
- [ ] Check log console để xem API_URL nào được dùng

### **Network:**
- [ ] Firewall không block port 5000
- [ ] Cùng WiFi (nếu dùng real device)
- [ ] VPN đã tắt
- [ ] IP address đúng

---

## 🎯 Quick Fix Checklist

1. **Tạo file .env:**
```bash
echo "EXPO_PUBLIC_API_URL=http://10.0.2.2:5000" > frontend/.env
```

2. **Restart backend:**
```bash
cd backend
npm start
```

3. **Restart Expo:**
```bash
cd frontend
npx expo start -c
```

4. **Test:**
- Mở app
- Đăng nhập
- Vào trang "Tài Khoản"
- Check console logs

---

## 📞 Vẫn Không Hoạt Động?

### **Debug Logs:**

Thêm vào WalletContext để debug:
```typescript
console.log('=== DEBUG INFO ===');
console.log('Platform:', Platform.OS);
console.log('API_URL:', API_URL);
console.log('Token:', token ? 'EXISTS' : 'MISSING');
console.log('==================');
```

### **Test Manual:**

Thử gọi API trực tiếp từ terminal:

```bash
# Test health check
curl http://10.0.2.2:5000

# Test wallet endpoint
curl http://10.0.2.2:5000/api/wallet \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎉 Hoàn Tất!

Sau khi làm theo các bước trên, lỗi "Network request failed" sẽ được khắc phục. 

**Nhớ:**
- ✅ Android emulator: `http://10.0.2.2:5000`
- ✅ iOS simulator: `http://localhost:5000`
- ✅ Real device: `http://YOUR_IP:5000`

Happy coding! 🚀


