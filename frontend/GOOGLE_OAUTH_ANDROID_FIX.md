# Hướng dẫn sửa lỗi Google OAuth 400: invalid_request trên Android

## Vấn đề
Lỗi "400: invalid_request" với `redirect_uri=frontend://` xảy ra vì custom scheme không tuân thủ OAuth 2.0 policy của Google.

## Giải pháp đã áp dụng

### 1. Đã sửa code (✅ Hoàn thành)
- ✅ Chuyển từ Implicit Flow sang Authorization Code Flow với PKCE
- ✅ Sử dụng `AuthSession.makeRedirectUri()` để tạo redirect URI đúng chuẩn
- ✅ Cập nhật scheme trong `app.json` từ `frontend` → `com.anonymous.frontend`
- ✅ Thêm Intent Filters cho Android deep linking

### 2. Cần cập nhật Google Cloud Console

**Bước 1: Truy cập Google Cloud Console**
1. Mở https://console.cloud.google.com/
2. Chọn project của bạn
3. Vào "APIs & Services" → "Credentials"

**Bước 2: Cập nhật Authorized Redirect URIs**

Tìm Web Client ID: `660684573821-i9sktrq6vpls0st0g8areqt3al9090f7`

Thêm các redirect URIs sau:

#### Cho Android:
```
com.anonymous.frontend:/oauth2redirect
```

#### Cho iOS (nếu cần):
```
com.anonymous.frontend:/oauth2redirect
```

#### Cho Web/Development:
```
http://localhost:8081
https://localhost:8081
http://localhost:19006
https://localhost:19006
```

**Bước 3: Lưu thay đổi**
- Click "Save"
- Đợi vài phút để thay đổi được áp dụng

### 3. Rebuild ứng dụng

Do đã thay đổi `app.json`, bạn cần rebuild lại app:

```bash
cd frontend

# Dừng Metro bundler hiện tại (Ctrl+C)

# Xóa cache
npx expo start --clear

# Hoặc rebuild lại Android app
npx expo run:android
```

### 4. Test lại

1. Mở app trên Android device/emulator
2. Tap vào nút "Đăng nhập bằng Google"
3. Bạn sẽ thấy màn hình đăng nhập Google
4. Sau khi chọn tài khoản, app sẽ redirect về và đăng nhập thành công

## Redirect URIs đã thay đổi

**Trước:**
- ❌ `frontend://` (không hợp lệ với OAuth 2.0)

**Sau:**
- ✅ `com.anonymous.frontend:/oauth2redirect` (đúng chuẩn OAuth 2.0)

## Lưu ý

### Package Name
Ứng dụng đang dùng package name: `com.anonymous.frontend`

Nếu bạn muốn đổi package name:
1. Sửa `package` trong `app.json` → `android` → `package`
2. Sửa `scheme` trong `app.json`
3. Sửa `scheme` trong `googleAuth.ts` → `makeRedirectUri()` → `scheme`
4. Cập nhật redirect URI trong Google Cloud Console
5. Rebuild app

### Troubleshooting

**Nếu vẫn gặp lỗi 400:**
1. Kiểm tra redirect URI đã được thêm đúng trong Google Cloud Console
2. Đợi 5-10 phút sau khi save
3. Clear cache và rebuild: `npx expo start --clear`
4. Kiểm tra log để xem redirect URI nào đang được dùng

**Kiểm tra redirect URI đang dùng:**
Xem trong log khi chạy app:
```
🔗 Redirect URI: com.anonymous.frontend:/oauth2redirect
```

URI này phải khớp với URI trong Google Cloud Console.

## Tài liệu tham khảo
- [Google OAuth 2.0 for Mobile Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Expo Deep Linking](https://docs.expo.dev/guides/linking/)


