# Hướng dẫn cấu hình AI Chat - Gợi ý lịch trình thông minh

## Tính năng

AI Chat sử dụng OpenRouter API với Grok model để tạo lịch trình du lịch thông minh cho người dùng dựa trên thông tin homestay và ngày đặt phòng.

## Cấu hình API Key

### 1. Lấy OpenRouter API Key

1. Truy cập [OpenRouter.ai](https://openrouter.ai/)
2. Đăng ký tài khoản hoặc đăng nhập
3. Vào trang [API Keys](https://openrouter.ai/keys)
4. Tạo API key mới
5. Copy API key

### 2. Thêm API Key vào file .env

Tạo hoặc cập nhật file `.env` trong thư mục `frontend`:

```env
EXPO_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key-here
EXPO_PUBLIC_APP_URL=http://localhost:8081
```

### 3. Khởi động lại ứng dụng

Sau khi thêm API key, khởi động lại Expo:

```bash
cd frontend
npm start
```

## Sử dụng

### Cách 1: Từ header của trang chi tiết homestay

1. Mở trang chi tiết homestay
2. Click vào icon **sparkles** (✨) ở header
3. Chat với AI để nhận gợi ý lịch trình

### Cách 2: Từ Room Booking Modal

1. Mở modal đặt phòng
2. Chọn ngày check-in và check-out
3. Click vào nút **"Gợi ý lịch trình AI"**
4. AI sẽ tự động tạo lịch trình dựa trên ngày đã chọn

## Tính năng của AI Chat

- ✅ Tự động tạo lịch trình chi tiết theo ngày
- ✅ Gợi ý điểm tham quan gần homestay
- ✅ Gợi ý nhà hàng/quán ăn ngon trong khu vực
- ✅ Gợi ý hoạt động vui chơi giải trí
- ✅ Tư vấn phương tiện di chuyển
- ✅ Hỗ trợ reasoning với Grok model để đưa ra gợi ý thông minh hơn

## Lưu ý

- API key cần được bảo mật, không commit vào git
- Thêm file `.env` vào `.gitignore`
- Model mặc định sử dụng: `x-ai/grok-4.1-fast:free` (miễn phí)
- Bạn có thể thay đổi model trong file `frontend/services/aiService.ts` nếu muốn

## Khắc phục lỗi

### Lỗi: "OpenRouter API key chưa được cấu hình"

- Kiểm tra file `.env` có tồn tại trong thư mục `frontend` không
- Kiểm tra biến `EXPO_PUBLIC_OPENROUTER_API_KEY` đã được set chưa
- Khởi động lại Expo sau khi thêm API key

### Lỗi: "API error: 401"

- Kiểm tra API key có đúng không
- Đảm bảo API key còn hiệu lực

### Lỗi: "API error: 429"

- Bạn đã vượt quá giới hạn rate limit
- Đợi một lúc rồi thử lại
- Hoặc nâng cấp tài khoản OpenRouter để tăng giới hạn

## Cấu trúc code

```
frontend/
├── services/
│   └── aiService.ts          # Service để gọi OpenRouter API
├── components/
│   └── AIChatModal.tsx       # Component chat modal với AI
└── app/
    └── homestay-detail.tsx   # Tích hợp AI Chat vào trang chi tiết
```

## Model hỗ trợ

- `x-ai/grok-4.1-fast:free` (mặc định, miễn phí)
- `x-ai/grok-2-1212` (trả phí)
- `x-ai/grok-beta` (trả phí, phiên bản mới nhất)

Xem danh sách đầy đủ tại: [OpenRouter Models](https://openrouter.ai/models)






















