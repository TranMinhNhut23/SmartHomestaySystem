# Backend API

## Cài đặt

```bash
npm install
```

## Cấu hình

Tạo file `.env` trong thư mục `backend`:

```env
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000
```

## Chạy server

```bash
npm start
```

Server sẽ chạy tại `http://localhost:5000`

## Lưu trữ ảnh

- **Ảnh avatar** được lưu trong thư mục `backend/uploads/avatars/`
- Database chỉ lưu **URL** của ảnh (ví dụ: `/uploads/avatars/avatar-1234567890.jpg`)
- Ảnh có thể truy cập qua: `http://localhost:5000/uploads/avatars/filename.jpg`
- Kích thước tối đa: 5MB
- Định dạng hỗ trợ: jpeg, jpg, png, gif, webp

## API Endpoints

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/me` - Lấy thông tin user hiện tại (cần token)

### Roles
- `GET /api/roles` - Lấy tất cả roles (cần đăng nhập)
- `POST /api/roles` - Tạo role mới (chỉ admin)

## Lưu ý

- Khi server khởi động, hệ thống sẽ tự động tạo 3 roles mặc định: `user`, `host`, `admin`
- Nếu roles chưa tồn tại khi đăng ký, hệ thống sẽ tự động khởi tạo lại
- Thư mục `uploads/avatars/` sẽ được tạo tự động khi có upload ảnh
