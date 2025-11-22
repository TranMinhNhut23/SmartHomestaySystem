# Cấu hình Google OAuth Authentication

## Thêm vào file `.env`

Thêm các biến môi trường sau vào file `backend/.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=1057716828846-vqofa3rpqfif688boij4732sg12uj4j7.apps.googleusercontent.com
```

## Lưu ý:

- **GOOGLE_CLIENT_ID**: Client ID từ Google Cloud Console
- Backend chỉ cần **GOOGLE_CLIENT_ID** để verify ID token từ frontend
- **GOOGLE_CLIENT_SECRET** không cần thiết vì frontend sẽ xử lý OAuth flow

## API Endpoint

### Đăng nhập bằng Google
```
POST /api/auth/google
Content-Type: application/json

Body:
{
  "idToken": "google_id_token_from_frontend"
}

Response:
{
  "success": true,
  "message": "Đăng nhập bằng Google thành công",
  "data": {
    "user": {
      "_id": "...",
      "username": "...",
      "email": "...",
      "avatar": "...",
      "roleName": "user",
      "googleId": "..."
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

## Cách hoạt động:

1. **Frontend** sử dụng Google Sign-In SDK để lấy ID token
2. **Frontend** gửi ID token đến backend qua endpoint `/api/auth/google`
3. **Backend** verify ID token với Google
4. **Backend** tạo hoặc cập nhật user trong database
5. **Backend** trả về JWT token để frontend sử dụng

## Tích hợp với Frontend:

Frontend cần:
1. Cài đặt Google Sign-In SDK (ví dụ: `@react-native-google-signin/google-signin` cho React Native)
2. Cấu hình với cùng `GOOGLE_CLIENT_ID`
3. Sau khi user đăng nhập thành công, lấy ID token và gửi đến backend

## Ví dụ Frontend (React Native):

```javascript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Cấu hình
GoogleSignin.configure({
  webClientId: '1057716828846-vqofa3rpqfif688boij4732sg12uj4j7.apps.googleusercontent.com',
});

// Đăng nhập
const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo.data;
    
    // Gửi idToken đến backend
    const response = await fetch('http://localhost:5000/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });
    
    const result = await response.json();
    if (result.success) {
      // Lưu token và chuyển đến màn hình chính
      await SecureStore.setItemAsync('token', result.data.token);
    }
  } catch (error) {
    console.error('Google login error:', error);
  }
};
```

## Troubleshooting:

### Lỗi "Thiếu cấu hình GOOGLE_CLIENT_ID":
- ✅ Kiểm tra file `.env` có biến `GOOGLE_CLIENT_ID`
- ✅ Đảm bảo giá trị đúng với Google Cloud Console

### Lỗi "Invalid token":
- ✅ Kiểm tra ID token có hợp lệ không
- ✅ Đảm bảo GOOGLE_CLIENT_ID trong frontend và backend giống nhau
- ✅ Kiểm tra token chưa hết hạn

### Lỗi "Email đã được sử dụng":
- ✅ User đã đăng ký bằng email/password trước đó
- ✅ Hệ thống sẽ tự động liên kết Google account với user hiện có



