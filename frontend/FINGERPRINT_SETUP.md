# Hướng dẫn Setup Fingerprint Authentication

## Vấn đề

`expo-local-authentication` là một **native module**, không hoạt động với Expo Go. Bạn cần tạo **development build** hoặc rebuild app.

## Giải pháp

### Option 1: Development Build (Khuyến nghị)

1. **Prebuild native code:**
   ```bash
   cd frontend
   npx expo prebuild
   ```

2. **Rebuild app:**
   ```bash
   # Android
   npx expo run:android

   # iOS
   npx expo run:ios
   ```

### Option 2: EAS Build (Nếu dùng EAS)

```bash
cd frontend
eas build --profile development --platform android
# hoặc
eas build --profile development --platform ios
```

### Option 3: Clear cache và rebuild

Nếu đã có development build:

```bash
cd frontend
# Clear cache
npx expo start --clear

# Rebuild
npx expo run:android
```

## Lưu ý

1. **Expo Go không hỗ trợ:** `expo-local-authentication` không hoạt động với Expo Go vì cần native code.

2. **Development Build:** Bạn cần tạo development build ít nhất một lần để có native modules.

3. **Permissions:** 
   - Android: Tự động request permission khi cần
   - iOS: Cần thêm vào `Info.plist` (tự động khi prebuild)

## Kiểm tra

Sau khi rebuild, mở app và:
1. Vào màn hình Login
2. Nếu thiết bị hỗ trợ, bạn sẽ thấy nút "Đăng nhập bằng vân tay"
3. Nhấn nút để test

## Troubleshooting

### Lỗi "Unable to resolve module"
- Đảm bảo đã chạy `npm install expo-local-authentication`
- Clear cache: `npx expo start --clear`
- Rebuild app: `npx expo run:android`

### Không thấy nút fingerprint
- Kiểm tra thiết bị có hỗ trợ fingerprint/face ID không
- Kiểm tra đã đăng ký fingerprint/face ID trên thiết bị chưa
- Xem console log để debug

### Lỗi permission trên Android
- Kiểm tra `AndroidManifest.xml` có permission `USE_BIOMETRIC` không (tự động thêm khi prebuild)

















