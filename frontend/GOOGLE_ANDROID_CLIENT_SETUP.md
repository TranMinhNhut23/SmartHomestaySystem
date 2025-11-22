# Hướng dẫn tạo Google Android Client ID

## 🎯 Mục đích
Để sử dụng Google OAuth với Expo Go trên Android, bạn cần tạo **Android Client ID** trong Google Cloud Console.

## ❓ Tại sao cần Android Client ID?

- ❌ **Web Client ID** không chấp nhận redirect URI với địa chỉ IP (`exp://192.168.x.x:8082/...`)
- ✅ **Android Client ID** không cần thêm redirect URI vào Google Console
- ✅ Google tự động verify app bằng package name + SHA-1 fingerprint

## 📋 Thông tin cần thiết

Đã lấy sẵn cho bạn:

- **Package name:** `com.anonymous.frontend`
- **SHA-1 fingerprint:** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

## 🛠️ HƯỚNG DẪN TẠO ANDROID CLIENT ID

### Bước 1: Truy cập Google Cloud Console

🔗 https://console.cloud.google.com/apis/credentials

Chọn project của bạn (project hiện tại có Web Client ID: `660684573821-...`)

### Bước 2: Tạo Android OAuth Client ID

1. Click nút **"+ CREATE CREDENTIALS"** ở trên
2. Chọn **"OAuth client ID"**
3. Trong dropdown **"Application type"**, chọn **"Android"**

### Bước 3: Điền thông tin

#### Name (Tên):
```
Android client (Debug)
```

#### Package name (Tên gói):
```
com.anonymous.frontend
```

#### SHA-1 certificate fingerprint (Dấu vân tay chứng chỉ):
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

**📸 Màn hình sẽ trông như này:**

```
┌─────────────────────────────────────────────────┐
│ Create OAuth client ID                          │
├─────────────────────────────────────────────────┤
│ Application type: Android             ▼         │
│                                                 │
│ Name *                                          │
│ Android client (Debug)                          │
│                                                 │
│ Package name *                                  │
│ com.anonymous.frontend                          │
│                                                 │
│ SHA-1 certificate fingerprint *                 │
│ 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:...     │
│                                                 │
│           [Cancel]        [CREATE]              │
└─────────────────────────────────────────────────┘
```

### Bước 4: Tạo và copy Client ID

1. Click **"CREATE"**
2. Một dialog sẽ hiện lên với **Android Client ID** (dạng: `660684573821-xxxxxxxx.apps.googleusercontent.com`)
3. **📋 Copy Client ID này** (Ctrl+C)

### Bước 5: Thêm vào file .env

1. Mở file `frontend/.env` (nếu chưa có, copy từ `.env.example`)
2. Thêm/sửa dòng:
   ```env
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=660684573821-xxxxxxxx.apps.googleusercontent.com
   ```
   (Thay `660684573821-xxxxxxxx.apps.googleusercontent.com` bằng Android Client ID bạn vừa copy)

3. Lưu file

### Bước 6: Restart Expo dev server

```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy:
npx expo start --clear
```

### Bước 7: Test lại

1. Mở app trên điện thoại Android
2. Tap nút **"Đăng nhập bằng Google"**
3. Xem log:
   ```
   🔑 Client Type: Android
   ```
4. Chọn tài khoản Google
5. **Thành công!** ✅

---

## 📝 Giải thích cách hoạt động

### Với Web Client ID (❌ Không hoạt động):
```
App → Google OAuth → Yêu cầu redirect về exp://192.168.2.16:8082/--/oauth2redirect
Google → Kiểm tra redirect URI trong danh sách → KHÔNG TÌM THẤY (vì không thể thêm exp:// với IP)
Google → TỪ CHỐI → Lỗi 400: invalid_request
```

### Với Android Client ID (✅ Hoạt động):
```
App → Google OAuth với package name + SHA-1
Google → Kiểm tra package name: com.anonymous.frontend ✓
Google → Kiểm tra SHA-1: 5E:8F:16:... ✓
Google → CHẤP NHẬN → Redirect về app → Đăng nhập thành công!
```

**Android Client ID không cần kiểm tra redirect URI!** Google xác thực bằng package name và SHA-1 fingerprint.

---

## 🔒 Về Release Build

File này dùng **debug.keystore** (cho development).

Khi build release/production:

1. Tạo release keystore
2. Lấy SHA-1 từ release keystore:
   ```bash
   keytool -list -v -keystore release.keystore -alias your-alias
   ```
3. Tạo Android Client ID mới với SHA-1 của release keystore
4. Thêm vào `.env.production`

---

## 🎉 Kết quả

Sau khi hoàn thành:

- ✅ Không cần thêm redirect URI vào Google Console
- ✅ Không phụ thuộc vào địa chỉ IP
- ✅ Hoạt động với Expo Go
- ✅ Hoạt động với standalone app
- ✅ Đăng nhập Google thành công!

---

## 🆘 Troubleshooting

### Lỗi "API key not valid"
- Kiểm tra đã enable **Google Sign-In API** trong Google Cloud Console
- Project → APIs & Services → Library → Search "Google Sign-In API" → Enable

### Lỗi vẫn còn sau khi thêm Android Client ID
1. Kiểm tra package name có đúng `com.anonymous.frontend` không
2. Kiểm tra SHA-1 có đúng không (chạy lại lệnh keytool)
3. Đảm bảo đã restart Expo dev server
4. Xem log để kiểm tra đang dùng Client Type nào

### Log không hiện "Client Type: Android"
- Kiểm tra biến môi trường `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` đã được set chưa
- File `.env` phải nằm trong thư mục `frontend/`
- Restart Expo: `npx expo start --clear`

---

## 📚 Tài liệu tham khảo

- [Google OAuth for Android](https://developers.google.com/identity/protocols/oauth2/native-app#android)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Get SHA-1 Fingerprint](https://developers.google.com/android/guides/client-auth)


