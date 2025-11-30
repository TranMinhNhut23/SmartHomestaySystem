# 💰 Hệ Thống Ví Điện Tử - Smart Homestay

## 📋 Tổng Quan

Hệ thống ví điện tử được tích hợp hoàn chỉnh vào ứng dụng Smart Homestay, cho phép người dùng:
- ✅ Nạp tiền qua MoMo và VNPay
- ✅ Thanh toán đặt phòng bằng ví
- ✅ Rút tiền về tài khoản ngân hàng
- ✅ Xem lịch sử giao dịch chi tiết
- ✅ Quản lý số dư và theo dõi chi tiêu

---

## 🏗️ Cấu Trúc Hệ Thống

### Backend

#### **Models**
- `Wallet.js` - Mô hình ví tiền với các trường:
  - `balance`: Số dư hiện tại
  - `totalDeposited`: Tổng tiền đã nạp
  - `totalWithdrawn`: Tổng tiền đã rút
  - `totalSpent`: Tổng tiền đã chi tiêu
  - `status`: Trạng thái ví (active/locked/suspended)

- `Transaction.js` - Mô hình giao dịch với các loại:
  - `deposit`: Nạp tiền
  - `withdraw`: Rút tiền
  - `payment`: Thanh toán đơn hàng
  - `refund`: Hoàn tiền
  - `bonus`: Tiền thưởng

#### **Services**
- `walletService.js` - Xử lý logic nghiệp vụ:
  - `createWallet()`: Tạo ví mới
  - `getWallet()`: Lấy thông tin ví
  - `deposit()`: Nạp tiền vào ví
  - `withdraw()`: Rút tiền từ ví
  - `payment()`: Thanh toán bằng ví
  - `refund()`: Hoàn tiền vào ví
  - `getTransactions()`: Lấy lịch sử giao dịch

#### **Controllers**
- `walletController.js` - Xử lý API requests:
  - GET `/api/wallet` - Lấy thông tin ví
  - POST `/api/wallet/deposit/momo` - Tạo thanh toán MoMo
  - POST `/api/wallet/deposit/vnpay` - Tạo thanh toán VNPay
  - POST `/api/wallet/withdraw` - Tạo yêu cầu rút tiền
  - GET `/api/wallet/transactions` - Lấy lịch sử giao dịch

#### **Routes**
- `/api/wallet` - Endpoints cho ví

### Frontend

#### **Contexts**
- `WalletContext.tsx` - Quản lý state toàn cục cho ví:
  - Tự động fetch thông tin ví khi đăng nhập
  - Cache dữ liệu để tối ưu performance
  - Xử lý loading và error states

#### **Components**
- `WalletSection.tsx` - Component hiển thị thông tin ví trên trang Account
  - Card ví với gradient đẹp mắt
  - Hiển thị số dư và thống kê
  - Quick actions: Nạp tiền, Xem lịch sử, Rút tiền

#### **Screens**
- `wallet.tsx` - Màn hình chi tiết ví
- `wallet-deposit.tsx` - Màn hình nạp tiền
- `wallet-transactions.tsx` - Màn hình lịch sử giao dịch
- `wallet-withdraw.tsx` - Màn hình rút tiền
- `wallet-deposit-result.tsx` - Màn hình kết quả thanh toán

---

## 🚀 Tính Năng Chi Tiết

### 1. Nạp Tiền Vào Ví

#### **Quy trình:**
1. User chọn "Nạp tiền" từ WalletSection
2. Nhập số tiền (10,000 - 50,000,000 VND)
3. Chọn phương thức: MoMo hoặc VNPay
4. Xác nhận và chuyển đến trang thanh toán
5. Hoàn tất thanh toán trên cổng thanh toán
6. Redirect về màn hình kết quả
7. Số dư ví được cập nhật tự động

#### **MoMo Integration:**
```javascript
// Backend tạo payment URL
POST /api/wallet/deposit/momo
Body: { amount: 100000 }

// Response
{
  "success": true,
  "data": {
    "paymentUrl": "https://test-payment.momo.vn/...",
    "orderId": "...",
    "requestId": "..."
  }
}

// Callback từ MoMo
POST /api/wallet/deposit/momo/callback
Body: { orderId, amount, signature, ... }
```

#### **VNPay Integration:**
```javascript
// Backend tạo payment URL
POST /api/wallet/deposit/vnpay
Body: { amount: 100000 }

// Response
{
  "success": true,
  "data": {
    "paymentUrl": "https://sandbox.vnpayment.vn/...",
    "txnRef": "..."
  }
}

// Callback từ VNPay (GET redirect)
GET /api/wallet/deposit/vnpay/callback?vnp_Amount=...&vnp_SecureHash=...
```

### 2. Xem Lịch Sử Giao Dịch

#### **Features:**
- Danh sách giao dịch với phân trang
- Filter theo loại giao dịch và trạng thái
- Hiển thị icon màu sắc theo loại giao dịch:
  - 🟢 Nạp tiền (xanh lá)
  - 🟡 Rút tiền (vàng)
  - 🔴 Thanh toán (đỏ)
  - 🔵 Hoàn tiền (xanh dương)
  - 🟣 Thưởng (tím)

- Pull to refresh để cập nhật
- Load more khi scroll xuống

#### **API:**
```javascript
GET /api/wallet/transactions?page=1&limit=20&type=deposit&status=completed

// Response
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### 3. Rút Tiền Về Tài Khoản

#### **Quy trình:**
1. User chọn "Rút tiền"
2. Nhập số tiền (tối thiểu 50,000 VND)
3. Nhập thông tin ngân hàng:
   - Tên ngân hàng
   - Số tài khoản
   - Tên chủ tài khoản
4. Ghi chú (tùy chọn)
5. Xác nhận yêu cầu
6. Admin xử lý yêu cầu trong 1-3 ngày làm việc

#### **API:**
```javascript
POST /api/wallet/withdraw
Body: {
  amount: 100000,
  bankInfo: {
    bankName: "Vietcombank",
    accountNumber: "1234567890",
    accountName: "NGUYEN VAN A"
  },
  note: "Rút tiền về tài khoản"
}
```

### 4. Thanh Toán Bằng Ví

Tính năng này sẽ được tích hợp vào booking flow:
1. Khi user đặt phòng, có thể chọn thanh toán bằng ví
2. Kiểm tra số dư đủ không
3. Trừ tiền từ ví và tạo transaction
4. Booking được xác nhận ngay lập tức

---

## 🔒 Bảo Mật & Tính Toàn Vẹn Dữ Liệu

### MongoDB Transactions
Tất cả các thao tác thay đổi số dư sử dụng MongoDB transactions để đảm bảo:
- ✅ ACID compliance
- ✅ Không mất mát dữ liệu
- ✅ Rollback khi có lỗi

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Update wallet balance
  // Create transaction record
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Signature Verification
- ✅ Verify signature từ MoMo và VNPay
- ✅ Kiểm tra tính hợp lệ của callback
- ✅ Ngăn chặn giả mạo giao dịch

### Authentication & Authorization
- ✅ Tất cả endpoints yêu cầu JWT token
- ✅ User chỉ có thể truy cập ví của chính mình
- ✅ Admin có quyền khóa/mở khóa ví

---

## 🎨 UI/UX Features

### Design System
- **Gradient Colors**: Sử dụng LinearGradient cho visual appeal
- **Color Coding**: Màu sắc phân biệt loại giao dịch
- **Icons**: Ionicons cho consistency
- **Dark Mode**: Hỗ trợ dark mode hoàn chỉnh

### Animations & Interactions
- ✅ Pull to refresh
- ✅ Loading states với ActivityIndicator
- ✅ Smooth transitions giữa các screens
- ✅ Touch feedback trên buttons

### User Experience
- ✅ Quick amounts cho nạp tiền nhanh
- ✅ Format currency theo chuẩn Việt Nam
- ✅ Error messages rõ ràng, dễ hiểu
- ✅ Confirmation dialogs cho các hành động quan trọng

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Tạo ví khi đăng ký user mới
- [ ] Nạp tiền qua MoMo thành công
- [ ] Nạp tiền qua VNPay thành công
- [ ] Verify signature từ payment gateways
- [ ] Rút tiền với số dư đủ
- [ ] Rút tiền với số dư không đủ (should fail)
- [ ] Thanh toán bằng ví
- [ ] Hoàn tiền vào ví
- [ ] Transaction rollback khi có lỗi
- [ ] Khóa ví (admin only)

### Frontend Testing
- [ ] Hiển thị thông tin ví đúng
- [ ] Navigate giữa các screens
- [ ] Nhập số tiền với validation
- [ ] Chọn phương thức thanh toán
- [ ] Mở link thanh toán external
- [ ] Hiển thị lịch sử giao dịch
- [ ] Pull to refresh hoạt động
- [ ] Load more pagination
- [ ] Dark mode display
- [ ] Error handling và hiển thị

---

## 📱 Screenshots

### Wallet Overview
```
┌─────────────────────────────────┐
│  💰 Ví của tôi                   │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 💳 Đang hoạt động           ││
│  │                             ││
│  │ Số dư khả dụng              ││
│  │ 1,234,567 ₫                 ││
│  │                             ││
│  │ 🟢 Đã nạp    🔴 Đã chi      ││
│  │ 2,000,000 ₫  765,433 ₫      ││
│  └─────────────────────────────┘│
│                                  │
│  ┌───┐  ┌───┐  ┌───┐           │
│  │ + │  │ ≡ │  │ 💵│           │
│  │Nạp│  │Lịch│  │Rút│           │
│  └───┘  └───┘  └───┘           │
└─────────────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# MoMo Payment
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_BASE_URL=https://test-payment.momo.vn

# VNPay Payment
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

#### Frontend (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Deployment

### Backend Deployment
1. Set environment variables trên production server
2. Ensure MongoDB supports transactions (Replica Set)
3. Setup webhook URLs cho MoMo và VNPay callbacks
4. Test payment flows trên production

### Frontend Deployment
1. Update API_URL to production backend
2. Build và deploy app
3. Test deep linking cho payment callbacks (nếu có)

---

## 📈 Future Enhancements

### Phase 2
- [ ] Ví cho Host (nhận tiền từ bookings)
- [ ] Auto withdrawal settings
- [ ] Bonus/Rewards program
- [ ] Transaction search và export
- [ ] Notification cho mọi giao dịch

### Phase 3
- [ ] Multiple payment methods (ATM, Credit Card)
- [ ] Wallet-to-wallet transfer
- [ ] Payment scheduling
- [ ] Spending analytics và insights
- [ ] Loyalty points integration

---

## 💡 Tips & Best Practices

### For Developers
1. **Always use transactions** cho thao tác thay đổi số dư
2. **Verify signatures** từ payment gateways
3. **Log everything** để debug và audit
4. **Handle errors gracefully** với meaningful messages
5. **Test rollback scenarios** kỹ lưỡng

### For Users
1. Kiểm tra thông tin ngân hàng kỹ trước khi rút tiền
2. Giữ số dư đủ trong ví để thanh toán nhanh
3. Xem lịch sử giao dịch thường xuyên
4. Liên hệ support nếu có vấn đề

---

## 📞 Support

Nếu gặp vấn đề với ví điện tử:
1. Kiểm tra log backend và frontend
2. Verify environment variables
3. Test payment gateway connectivity
4. Check MongoDB transactions support
5. Review signature verification logic

---

## ✅ Completion Checklist

### Backend ✅
- [x] Wallet Model
- [x] Transaction Model
- [x] Wallet Service
- [x] Wallet Controller
- [x] Wallet Routes
- [x] Integration với Auth Service
- [x] Integration với Payment Service
- [x] MoMo Deposit
- [x] VNPay Deposit
- [x] Withdraw Request
- [x] Transaction History

### Frontend ✅
- [x] Wallet Context
- [x] Wallet Section Component
- [x] Wallet Screen
- [x] Deposit Screen
- [x] Transactions Screen
- [x] Withdraw Screen
- [x] Deposit Result Screen
- [x] Navigation Setup
- [x] Integration với Account Screen
- [x] Dark Mode Support

---

## 🎉 Hoàn Tất!

Hệ thống ví điện tử đã sẵn sàng sử dụng! 🚀

**Các bước tiếp theo:**
1. Test toàn bộ flow từ đăng ký đến nạp tiền
2. Verify callbacks từ MoMo và VNPay
3. Test trên các thiết bị khác nhau
4. Deploy lên production
5. Monitor logs và user feedback

**Happy Coding! 💻**


