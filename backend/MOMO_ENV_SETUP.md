# Cấu hình MoMo Payment trong file .env

Tạo file `.env` trong thư mục `backend` với nội dung sau (dòng 1-21 cho cấu hình MoMo):

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000

# Base URL Configuration
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:8081

# MoMo Payment Configuration (Dòng 1-21)
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_PARTNER_CODE=MOMO
MOMO_PARTNER_NAME=MoMo Payment
MOMO_STORE_ID=Test Store
MOMO_PAYMENT_CODE=L/U2a6KeeeBBU/pQAa+g8LilOVzWfvLf/P4XOnAQFmnkrKHICj51qrOTUQ+YrX8/Xs1YD4IOdyiGSkCfV6Je9PeRzl3sO+mDzXNG4enhigU3VGPFh67a37dSwItMJXRDuK64DCqv35YPQtiAOVVZV35/1XBw1rWopmRP03YMNgQWedGLHwmPSkRGoT6XtDSeypJtgbLZ5KIOJsdcynBdFEnHAuIjvo4stADmRL8GqdgsZ0jJCx/oq5JGr8wY+a4g9KolEOSTLBTih48RrGZq3LDBbT4QGBjtW+0W+/95n8W0Aot6kzdG4rWg1NB7EltY6/A8RWAHJav4kWQoFcxgfA==
MOMO_BASE_URL=https://test-payment.momo.vn
MOMO_LANG=vi
```

## Lưu ý:
- Các giá trị trên là test credentials từ MoMo
- Trong môi trường production, cần thay thế bằng credentials thực tế từ MoMo
- PaymentService sẽ tự động validate các biến môi trường khi khởi tạo







