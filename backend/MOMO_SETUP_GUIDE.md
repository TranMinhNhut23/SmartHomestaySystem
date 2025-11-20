# Hướng dẫn cấu hình MoMo Payment

## Vấn đề: Lỗi 403 Forbidden khi thanh toán

### Nguyên nhân:
MoMo không thể truy cập `localhost` hoặc IP nội bộ (192.168.x.x) từ server của họ để gọi callback.

### Giải pháp:

## Cách 1: Sử dụng Ngrok (Khuyến nghị cho Development)

### Bước 1: Cài đặt Ngrok
1. Tải ngrok từ: https://ngrok.com/download
2. Hoặc cài qua npm: `npm install -g ngrok`

### Bước 2: Chạy Ngrok
```bash
ngrok http 5000
```

Bạn sẽ nhận được URL công khai, ví dụ:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5000
```

### Bước 3: Cập nhật .env
Thêm vào file `backend/.env`:
```env
BASE_URL=https://abc123.ngrok.io
```

**Lưu ý:** URL ngrok thay đổi mỗi lần khởi động (trừ khi dùng plan có trả phí). Cần cập nhật lại BASE_URL mỗi lần.

## Cách 2: Sử dụng Cloudflare Tunnel (Miễn phí, URL cố định)

### Bước 1: Cài đặt cloudflared
```bash
# Windows (PowerShell)
winget install --id Cloudflare.cloudflared

# Mac
brew install cloudflared

# Linux
# Tải từ: https://github.com/cloudflare/cloudflared/releases
```

### Bước 2: Chạy tunnel
```bash
cloudflared tunnel --url http://localhost:5000
```

Bạn sẽ nhận được URL công khai, ví dụ:
```
https://random-name.trycloudflare.com
```

### Bước 3: Cập nhật .env
```env
BASE_URL=https://random-name.trycloudflare.com
```

## Cách 3: Deploy lên Server có Domain (Production)

### Nếu đã có server và domain:
1. Deploy backend lên server
2. Cấu hình domain trỏ về server
3. Cập nhật .env:
```env
BASE_URL=https://yourdomain.com
```

## Cách 4: Sử dụng LocalTunnel (Miễn phí)

### Bước 1: Cài đặt
```bash
npm install -g localtunnel
```

### Bước 2: Chạy tunnel
```bash
lt --port 5000
```

Bạn sẽ nhận được URL công khai, ví dụ:
```
https://random-name.loca.lt
```

### Bước 3: Cập nhật .env
```env
BASE_URL=https://random-name.loca.lt
```

## Kiểm tra cấu hình

Sau khi cấu hình BASE_URL, kiểm tra:

1. **Truy cập URL công khai:**
   ```
   https://your-tunnel-url.com
   ```
   Phải thấy: `{"success":true,"message":"API đang hoạt động"}`

2. **Kiểm tra callback URLs:**
   ```
   https://your-tunnel-url.com/api/payments/momo/return
   https://your-tunnel-url.com/api/payments/momo/ipn
   ```
   Các URL này phải có thể truy cập được từ internet.

## Lưu ý quan trọng:

1. **BASE_URL phải là HTTPS** (khuyến nghị) hoặc HTTP
2. **BASE_URL không được có dấu `/` ở cuối**
3. **BASE_URL phải có thể truy cập từ internet** (không phải localhost/IP nội bộ)
4. **Kiểm tra firewall** cho phép kết nối từ internet
5. **Trong production**, nên dùng domain thật và HTTPS

## Ví dụ cấu hình .env đúng:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key
PORT=5000

# Base URLs (QUAN TRỌNG: Phải là URL công khai)
BASE_URL=https://abc123.ngrok.io
FRONTEND_URL=http://localhost:8081

# MoMo Payment
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_PARTNER_CODE=MOMO
MOMO_BASE_URL=https://test-payment.momo.vn
MOMO_LANG=vi
```

## Troubleshooting

### Lỗi 403 Forbidden:
- ✅ Kiểm tra BASE_URL có thể truy cập từ internet không
- ✅ Kiểm tra BASE_URL không phải localhost/IP nội bộ
- ✅ Kiểm tra firewall không chặn kết nối

### Lỗi Connection Refused:
- ✅ Kiểm tra backend đang chạy trên port 5000
- ✅ Kiểm tra ngrok/tunnel đang chạy
- ✅ Kiểm tra BASE_URL đúng với URL từ ngrok/tunnel

### Lỗi Invalid Signature:
- ✅ Kiểm tra MOMO_SECRET_KEY đúng
- ✅ Kiểm tra raw signature format đúng
- ✅ Kiểm tra extraData không bị encode base64 trong signature







