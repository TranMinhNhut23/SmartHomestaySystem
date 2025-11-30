# Hướng dẫn Setup Wallet với MoMo/VNPay

## Vấn đề đã fix

❌ **Trước**: MoMo không thể gọi IPN callback về localhost
✅ **Sau**: Dùng ngrok URL cho backend để nhận IPN callback

## Cấu hình Backend

### 1. Cập nhật file `backend/.env`

```env
# Backend URL - PHẢI là URL công khai (ngrok)
BACKEND_URL=https://glegly-unquixotic-anissa.ngrok-free.dev

# Frontend URL - Expo app URL
FRONTEND_URL=http://localhost:8081

# MoMo credentials (test sandbox)
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz

# VNPay credentials (test sandbox)
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
```

### 2. Khởi động ngrok

```bash
# Terminal 1: Start ngrok
ngrok http 5000

# Copy HTTPS URL và paste vào BACKEND_URL trong .env
```

### 3. Khởi động backend

```bash
# Terminal 2: Start backend
cd backend
npm start
```

## Cấu hình Frontend

### 1. Cập nhật file `frontend/.env`

```env
# Dùng ngrok URL
EXPO_PUBLIC_API_URL=https://glegly-unquixotic-anissa.ngrok-free.dev
```

### 2. Xóa cache và khởi động lại

```bash
# Terminal 3: Clear cache and start
cd frontend
rm -rf .expo node_modules/.cache
npx expo start -c --clear
```

## Luồng hoạt động

### MoMo Payment Flow

1. **User tạo deposit request** → Frontend gọi `/api/wallet/deposit/momo`
2. **Backend tạo payment URL** → Trả về `payUrl`, `deeplink`, `qrCodeUrl`
3. **Frontend mở MoMo app** → Ưu tiên `deeplink`, fallback `payUrl`
4. **User thanh toán trong MoMo** → MoMo xử lý thanh toán
5. **MoMo gọi IPN callback** → `POST /api/wallet/deposit/momo/callback` (server-to-server)
6. **Backend xử lý IPN** → Nạp tiền vào ví nếu thành công
7. **MoMo redirect user** → `GET /api/wallet/deposit/momo/redirect`
8. **Backend redirect về app** → `${FRONTEND_URL}/wallet-deposit-result?success=true`
9. **App hiển thị kết quả** → Refresh wallet và show success screen

### URLs cần thiết

```
IPN URL (MoMo → Backend):
POST https://glegly-unquixotic-anissa.ngrok-free.dev/api/wallet/deposit/momo/callback

Redirect URL (MoMo → Backend → App):
GET https://glegly-unquixotic-anissa.ngrok-free.dev/api/wallet/deposit/momo/redirect
→ Redirect to: http://localhost:8081/wallet-deposit-result?success=true
```

## Kiểm tra

### 1. Test MoMo deposit

```bash
# Trong app, chọn MoMo và nạp tiền
# Xem logs backend:
```

Backend logs nên thấy:

```
✅ MoMo response body: {"resultCode":0,"payUrl":"...","deeplink":"momo://..."}
✅ IPN received: {"resultCode":0,"orderId":"...","transId":"..."}
✅ Deposit successful
```

### 2. Kiểm tra database

```javascript
// MongoDB
db.transactions.find({ type: 'deposit', status: 'completed' }).sort({ createdAt: -1 }).limit(1)
db.wallets.findOne({ user: ObjectId('...') })
```

## Troubleshooting

### 1. MoMo không callback

❌ **Nguyên nhân**: `BACKEND_URL` vẫn là localhost

✅ **Giải pháp**:
- Kiểm tra `backend/.env` có `BACKEND_URL` đúng ngrok URL không
- Restart backend sau khi sửa .env
- Xem logs backend xem có cảnh báo không

### 2. App không nhận kết quả

❌ **Nguyên nhân**: Redirect URL không đúng

✅ **Giải pháp**:
- Kiểm tra `FRONTEND_URL` trong backend `.env`
- Đảm bảo Expo đang chạy trên đúng port 8081

### 3. Duplicate transaction

❌ **Nguyên nhân**: Cả IPN và redirect đều tạo transaction

✅ **Giải pháp**:
- IPN handler đã được fix để chỉ tạo 1 transaction
- Redirect handler chỉ redirect, không tạo transaction

## Notes

- **IPN** = Instant Payment Notification (server-to-server)
- **Redirect** = User được redirect về app sau thanh toán
- IPN và Redirect là 2 callbacks riêng biệt
- IPN đáng tin cậy hơn Redirect (user có thể không quay lại app)
- Backend ưu tiên xử lý IPN để đảm bảo không mất giao dịch

## Flow Chart

```
[User] → [Frontend] → [Backend] → [MoMo]
                                      ↓
                                   [Payment]
                                      ↓
                        ┌─────────────┴─────────────┐
                        ↓                           ↓
                    [IPN Callback]           [User Redirect]
                        ↓                           ↓
              [Backend: Nạp tiền]         [Backend: Redirect]
                        ↓                           ↓
                  [Response 200]              [App Result Screen]
```


