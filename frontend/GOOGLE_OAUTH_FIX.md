# Sửa lỗi Google OAuth bị "dính" ở auth.expo.io

## Vấn đề:
Sau khi đăng nhập Google thành công, app bị "dính" ở `https://auth.expo.io/@anonymous/frontend` và không quay về app.

## Nguyên nhân:
Expo proxy (`auth.expo.io`) không tự động redirect về app khi dùng với `WebBrowser.openAuthSessionAsync`.

## Giải pháp:

### Cách 1: Dùng localhost (Khuyến nghị cho Development)

1. **Cập nhật Google Cloud Console:**
   - Vào Google Cloud Console > APIs & Services > Credentials
   - Click vào **Web Client ID** của bạn
   - Trong **Authorized redirect URIs**, thêm:
     ```
     http://localhost:8081
     ```
   - Click **SAVE**

2. **Code đã được cập nhật** để dùng `http://localhost:8081` cho web và `frontend://` cho mobile

3. **Lưu ý:**
   - `localhost` chỉ hoạt động trên web hoặc emulator
   - Trên thiết bị thật, cần dùng cách 2

### Cách 2: Tạo iOS/Android Client ID (Cho Production)

1. **Tạo iOS Client ID:**
   - Vào Google Cloud Console > Credentials
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Chọn **Application type**: **iOS**
   - Nhập **Bundle ID**: `com.anonymous.frontend` (từ app.json)
   - Click **CREATE**
   - Copy **Client ID**

2. **Tạo Android Client ID:**
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Chọn **Application type**: **Android**
   - Nhập **Package name**: `com.anonymous.frontend` (từ app.json)
   - Nhập **SHA-1 certificate fingerprint**: Lấy từ keystore
   - Click **CREATE**
   - Copy **Client ID**

3. **Cập nhật code:**
   - Sử dụng iOS Client ID cho iOS
   - Sử dụng Android Client ID cho Android
   - Dùng custom scheme `frontend://` làm redirect URI

### Cách 3: Dùng expo-auth-session/providers/google (Đơn giản nhất)

Sử dụng hook `useAuthRequest` từ `expo-auth-session/providers/google` - nó tự động xử lý redirect.

## Hiện tại:

Code đã được cập nhật để:
- Dùng `http://localhost:8081` cho web
- Dùng `frontend://` cho mobile (cần iOS/Android Client ID)

**Bước tiếp theo:**
1. Thêm `http://localhost:8081` vào Google Cloud Console
2. Test lại trên web/emulator
3. Nếu cần chạy trên thiết bị thật, tạo iOS/Android Client ID



