# Hướng dẫn cấu hình Google OAuth cho Expo

## Bước 1: Tạo Web Client ID trong Google Cloud Console

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project của bạn
3. Vào **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
5. Chọn **Application type**: **Web application**
6. Đặt tên: `Expo Web Client` (hoặc tên bạn muốn)
7. **QUAN TRỌNG**: Để trống **Authorized redirect URIs** lúc này. Chúng ta sẽ thêm sau khi chạy app và xem redirect URI thực tế.
   
   **Lưu ý về format redirect URI cho Web Client ID:**
   - ✅ Phải là full URL với domain (ví dụ: `https://auth.expo.io`)
   - ✅ Không được có path (ví dụ: không được `/frontend`)
   - ✅ Không được có trailing slash (ví dụ: không được `https://auth.expo.io/`)
   - ❌ Custom scheme như `frontend://` hoặc `exp://` KHÔNG được chấp nhận cho Web Client ID
8. Click **CREATE**
9. Copy **Client ID** (sẽ có dạng: `xxxxx-xxxxx.apps.googleusercontent.com`)

## Bước 2: Cập nhật Client ID trong code

Cập nhật `GOOGLE_CLIENT_ID` trong file `frontend/utils/googleAuth.ts`:

```typescript
const GOOGLE_CLIENT_ID = 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';
```

## Bước 3: Cập nhật Backend

Đảm bảo `GOOGLE_CLIENT_ID` trong `backend/.env` cũng giống với Web Client ID:

```env
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com
```

## Lưu ý quan trọng:

- ✅ **Web Client ID** - Dùng cho Expo và `expo-auth-session`
- ❌ **Android Client ID** - Chỉ dùng cho native Android app
- ❌ **iOS Client ID** - Chỉ dùng cho native iOS app

## Bước 4: Lấy Redirect URI thực tế từ app

1. Chạy app: `npm start` hoặc `expo start`
2. Mở màn hình login và nhấn nút "Đăng nhập bằng Google"
3. Xem console log, bạn sẽ thấy:
   ```
   🔗 Redirect URI: https://auth.expo.io/@username/project-slug
   ```
4. **Copy chính xác redirect URI này** (chỉ lấy phần domain, không lấy path nếu có)

## Bước 5: Thêm Redirect URI vào Google Cloud Console

### Thêm Redirect URI vào Google Cloud Console

1. Vào Google Cloud Console > APIs & Services > Credentials
2. Click vào **Web Client ID** của bạn (KHÔNG phải Android/iOS Client ID)
3. Chạy app và nhấn nút "Đăng nhập bằng Google"
4. Xem console log, bạn sẽ thấy:
   ```
   🔗 Full Redirect URI: https://auth.expo.io/@anonymous/frontend
   📋 Redirect URI cần thêm: https://auth.expo.io/@anonymous/frontend
   ```
5. **Copy CHÍNH XÁC redirect URI từ console log** (ví dụ: `https://auth.expo.io/@anonymous/frontend`)
6. Trong phần **Authorized redirect URIs**, thêm redirect URI vừa copy
7. **QUAN TRỌNG**: 
   - ✅ Thêm **FULL URI** bao gồm cả path (ví dụ: `https://auth.expo.io/@anonymous/frontend`)
   - ✅ URI phải khớp chính xác với redirect URI trong code
   - ❌ KHÔNG chỉ thêm domain: `https://auth.expo.io` (sẽ không hoạt động)
   - ❌ KHÔNG thêm: `exp://192.168.x.x:8081` (không hợp lệ)
   - ❌ KHÔNG thêm: `frontend://` (không hợp lệ)
8. Click **SAVE**

**Ví dụ đúng:**
- ✅ `https://auth.expo.io/@anonymous/frontend` (full URI với path - đúng)
- ✅ `https://auth.expo.io/@your-username/your-project` (full URI với username thực tế)
- ❌ `https://auth.expo.io` (chỉ domain - không đủ)
- ❌ `exp://192.168.2.16:8081` (không phải HTTPS - không hợp lệ)
- ❌ `frontend://` (custom scheme - không hợp lệ)

## Troubleshooting:

### Lỗi "invalid_request" (Error 400):
- ✅ Kiểm tra đã dùng **Web Client ID**, không phải Android/iOS Client ID
- ✅ Kiểm tra redirect URI đã được thêm vào Google Cloud Console
- ✅ Đảm bảo redirect URI khớp chính xác (bao gồm scheme và path)

### Lỗi "redirect_uri_mismatch":
- ✅ Copy chính xác redirect URI từ console log
- ✅ Thêm vào Google Cloud Console > OAuth Client > Authorized redirect URIs
- ✅ Đợi vài phút để Google cập nhật cấu hình

