# Checklist cấu hình Google OAuth

## ✅ Những gì CẦN:

### 1. Google Client ID (Web Application)
- ✅ **CẦN**: Web Client ID từ Google Cloud Console
- ✅ Đã cập nhật trong `frontend/utils/googleAuth.ts`: `427675325677-m21ifvu776m66qjntd04omi47q7h5hqh.apps.googleusercontent.com`
- ✅ Cần cập nhật trong `backend/.env`: `GOOGLE_CLIENT_ID=427675325677-m21ifvu776m66qjntd04omi47q7h5hqh.apps.googleusercontent.com`

### 2. Redirect URI trong Google Cloud Console
- ✅ Thêm redirect URI: `https://auth.expo.io/@anonymous/frontend` (hoặc URI từ console log)
- ✅ Đảm bảo redirect URI khớp chính xác với URI trong code

## ❌ Những gì KHÔNG CẦN:

- ❌ **Client Secret** - KHÔNG cần (vì đây là public client flow)
- ❌ **API Key** - KHÔNG cần
- ❌ **Service Account Key** - KHÔNG cần
- ❌ **OAuth 2.0 Credentials khác** - KHÔNG cần

## 📋 Checklist hoàn thành:

- [ ] Web Client ID đã được tạo trong Google Cloud Console
- [ ] Client ID đã được cập nhật trong `frontend/utils/googleAuth.ts`
- [ ] Client ID đã được cập nhật trong `backend/.env`
- [ ] Redirect URI đã được thêm vào Google Cloud Console
- [ ] Redirect URI trong Google Cloud Console khớp với URI trong console log
- [ ] Đã test đăng nhập bằng Google

## 🔍 Kiểm tra nhanh:

1. **Frontend**: Mở `frontend/utils/googleAuth.ts`, kiểm tra `GOOGLE_CLIENT_ID`
2. **Backend**: Mở `backend/.env`, kiểm tra `GOOGLE_CLIENT_ID` có giống frontend không
3. **Google Cloud Console**: 
   - Vào APIs & Services > Credentials
   - Kiểm tra Web Client ID có redirect URI đúng không

## ⚠️ Lưu ý:

- Client ID ở frontend và backend **PHẢI GIỐNG NHAU**
- Redirect URI phải khớp chính xác (bao gồm cả path)
- Không cần Client Secret cho flow này




