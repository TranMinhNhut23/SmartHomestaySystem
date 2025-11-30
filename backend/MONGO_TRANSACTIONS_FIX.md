# Fix MongoDB Transactions Error

## Vấn đề

```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

MongoDB transactions CHỈ hoạt động trên:
- ✅ MongoDB Atlas (cloud)
- ✅ MongoDB Replica Set (3+ nodes)
- ❌ Standalone MongoDB (local) ← Đang dùng

## Giải pháp Quick Fix

### Bước 1: Thêm vào `backend/.env`

```env
# Disable MongoDB transactions cho dev (standalone MongoDB)
USE_MONGO_TRANSACTIONS=false
```

### Bước 2: Restart backend

```bash
cd backend
npm start
```

### Bước 3: Test lại deposit

App → Ví → Nạp tiền → MoMo → 50,000 VND

## Note

- Trong production với MongoDB Atlas, set `USE_MONGO_TRANSACTIONS=true`
- Transactions giúp đảm bảo data integrity
- Không dùng transactions = nếu lỗi giữa chừng, data có thể inconsistent
- Nhưng cho dev/test thì OK

## Alternative: Dùng MongoDB Atlas (Recommended)

1. Tạo account free: https://www.mongodb.com/cloud/atlas
2. Tạo cluster free (M0)
3. Lấy connection string
4. Update `MONGODB_URI` trong `.env`
5. Set `USE_MONGO_TRANSACTIONS=true`


