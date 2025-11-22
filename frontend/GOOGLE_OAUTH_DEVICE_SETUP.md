# Hướng dẫn cấu hình Google OAuth cho thiết bị thật

## Vấn đề:
`localhost` không hoạt động trên thiết bị thật vì `localhost` trên thiết bị trỏ về chính thiết bị, không phải máy development.

## Giải pháp: Tạo iOS/Android Client ID

### Bước 1: Tạo iOS Client ID

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. Vào **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
5. Chọn **Application type**: **iOS**
6. Đặt tên: `iOS Client` (hoặc tên bạn muốn)
7. Nhập **Bundle ID**: `com.anonymous.frontend` (từ app.json)
8. Click **CREATE**
9. Copy **Client ID** (sẽ có dạng: `xxxxx-xxxxx.apps.googleusercontent.com`)

### Bước 2: Tạo Android Client ID

1. Vào **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Chọn **Application type**: **Android**
4. Đặt tên: `Android Client` (hoặc tên bạn muốn)
5. Nhập **Package name**: `com.anonymous.frontend` (từ app.json)
6. **Lấy SHA-1 certificate fingerprint:**

   **Cho Debug keystore (development):**
   ```bash
   # Windows
   keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

   # Mac/Linux
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   Copy SHA-1 fingerprint (dạng: `XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX`)

7. Nhập **SHA-1 certificate fingerprint** vào Google Cloud Console
8. Click **CREATE**
9. Copy **Client ID**

### Bước 3: Cập nhật code

Code sẽ tự động chọn Client ID phù hợp dựa trên platform:
- iOS: Dùng iOS Client ID
- Android: Dùng Android Client ID
- Web: Dùng Web Client ID

### Bước 4: Cập nhật redirect URI

Với iOS/Android Client ID, redirect URI sẽ là custom scheme: `frontend://`

**Lưu ý:** Custom scheme đã được cấu hình trong `app.json`:
```json
"scheme": "frontend"
```

## Tóm tắt:

1. ✅ Tạo iOS Client ID với Bundle ID: `com.anonymous.frontend`
2. ✅ Tạo Android Client ID với Package name: `com.anonymous.frontend` và SHA-1
3. ✅ Code sẽ tự động dùng Client ID phù hợp
4. ✅ Redirect URI: `frontend://` (tự động)

## Sau khi tạo xong:

1. Cập nhật Client ID trong code (hoặc dùng environment variables)
2. Build lại app: `npx expo run:android` hoặc `npx expo run:ios`
3. Test trên thiết bị thật



