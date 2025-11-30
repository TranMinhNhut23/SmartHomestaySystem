# 🏦 Host Wallet Payment System

## Tổng quan

Hệ thống cho phép host nhận tiền từ các đơn đặt phòng trực tiếp vào ví trong app. Khi khách hàng thanh toán thành công, tiền sẽ tự động được chuyển vào ví của host.

---

## 📊 Flow Hoạt Động

```
┌─────────────┐
│   Guest     │
│  Đặt phòng  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Booking Created    │
│  Status: pending    │
│  PaymentStatus:     │
│     pending         │
└──────┬──────────────┘
       │
       │ Guest thanh toán
       │ (MoMo/VNPay/Wallet)
       ▼
┌─────────────────────┐
│  Payment Success    │
│  Update:            │
│  paymentStatus =    │
│     'paid'          │
└──────┬──────────────┘
       │
       │ 🔄 AUTO TRIGGER
       ▼
┌─────────────────────┐
│ processHostPayment  │
│ Transfer money      │
│ to Host Wallet      │
└──────┬──────────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌─────────────┐
│ Host Wallet  │   │ Notification│
│ Balance ↑    │   │ to Host     │
└──────────────┘   └─────────────┘
```

---

## 🔧 Cài Đặt & Sử Dụng

### 1. Tự động (Khuyến nghị)

Khi cập nhật `paymentStatus` thành `'paid'`, hệ thống sẽ **tự động** chuyển tiền cho host:

```javascript
// Trong payment callback (MoMo/VNPay/Wallet)
await bookingService.updateBookingPaymentStatus(bookingId, 'paid', {
  paymentTransactionId: txnRef,
  paymentMethod: 'momo' // hoặc 'vnpay', 'wallet'
});

// ✅ Hệ thống tự động:
// 1. Cập nhật booking.paymentStatus = 'paid'
// 2. Chuyển tiền vào ví host
// 3. Tạo transaction record
// 4. Gửi notification cho host
```

### 2. Thủ công (Nếu cần)

Nếu muốn tách riêng hai bước:

```javascript
// Bước 1: Cập nhật payment status
const booking = await Booking.findById(bookingId);
booking.paymentStatus = 'paid';
booking.paymentTransactionId = txnRef;
await booking.save();

// Bước 2: Manually trigger host payment
await bookingService.processHostPayment(bookingId);
```

---

## 🌐 API Endpoints

### 1. Cập nhật Payment Status (Auto Transfer)

```http
PUT /api/bookings/:id/payment-status
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentStatus": "paid",
  "paymentTransactionId": "MOMO12345678",
  "paymentMethod": "momo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật payment status thành công",
  "data": {
    "_id": "booking123",
    "paymentStatus": "paid",
    ...
  }
}
```

### 2. Manual Host Payment Trigger

```http
POST /api/bookings/:id/process-host-payment
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Chuyển tiền cho host thành công",
  "data": {
    "success": true,
    "booking": { ... },
    "hostPayment": {
      "wallet": { ... },
      "transaction": { ... }
    },
    "amount": 500000
  }
}
```

---

## 💰 Tính Toán Số Tiền

Host nhận **số tiền thực tế khách đã trả** (sau khi áp dụng discount):

```javascript
// Ví dụ:
originalPrice: 600,000 VNĐ
discountAmount: 100,000 VNĐ (coupon)
totalPrice: 500,000 VNĐ

→ Host nhận: 500,000 VNĐ (booking.totalPrice)
```

---

## 📝 Transaction Record

Mỗi khi host nhận tiền, hệ thống tạo 1 transaction record:

```javascript
{
  wallet: hostWalletId,
  user: hostId,
  type: 'deposit',
  amount: 500000,
  balanceBefore: 1000000,
  balanceAfter: 1500000,
  status: 'completed',
  paymentMethod: 'momo',
  booking: bookingId,
  description: 'Nhận tiền từ đơn đặt phòng #abc123 - Villa Seaview',
  note: 'Khách: john_doe',
  metadata: {
    source: 'booking_payment',
    guestId: '...',
    homestayId: '...',
    roomId: '...',
    originalPrice: 600000,
    discountAmount: 100000,
    couponCode: 'WELCOME50'
  },
  completedAt: '2025-11-26T10:30:00.000Z'
}
```

---

## 🔔 Notifications

Host sẽ nhận notification khi có tiền vào ví:

```javascript
{
  user: hostId,
  type: 'host_received_payment',
  title: '💰 Bạn đã nhận được thanh toán',
  message: 'Bạn đã nhận 500,000 VNĐ từ đơn đặt phòng của john_doe tại Villa Seaview - Room 101.',
  data: {
    bookingId: '...',
    homestayId: '...',
    guestId: '...',
    amount: 500000
  },
  isRead: false,
  role: 'host'
}
```

---

## 🔍 Logging

Hệ thống log chi tiết mọi bước:

```
💰 Processing host payment for booking 673...
- Host ID: 691...
- Amount: 500000 VNĐ
- Homestay: Villa Seaview

✅ Booking payment received by host: Host 691..., Amount: 500000, New Balance: 1500000
✅ Host payment successful!
- Transaction ID: 674...
- Host new balance: 1500000 VNĐ
✅ Notification sent to host
```

---

## ⚠️ Error Handling

### Trường hợp lỗi phổ biến:

1. **Booking chưa thanh toán:**
   ```
   Error: Booking chưa được thanh toán
   ```
   → Đảm bảo `paymentStatus = 'paid'` trước khi gọi

2. **Host không có ví:**
   ```
   Host chưa có ví, đang tạo...
   ```
   → Hệ thống tự động tạo ví mới cho host

3. **Ví host bị khóa:**
   ```
   Error: Ví của host đang bị khóa hoặc tạm ngưng
   ```
   → Admin cần mở khóa ví host

4. **Lỗi chuyển tiền:**
   ```
   ❌ Auto host payment failed (booking payment status still updated)
   ```
   → Booking vẫn được mark là 'paid', admin có thể manually trigger lại

---

## 🧪 Testing

### Test Flow Hoàn Chỉnh:

```javascript
// 1. Tạo booking
const booking = await bookingService.createBooking({...}, guestId);

// 2. Simulate payment success
await bookingService.updateBookingPaymentStatus(booking._id, 'paid', {
  paymentTransactionId: 'TEST123',
  paymentMethod: 'wallet'
});

// 3. Kiểm tra ví host
const hostWallet = await walletService.getWallet(hostId);
console.log('Host balance:', hostWallet.balance);
// Expect: balance tăng = booking.totalPrice

// 4. Kiểm tra transaction
const transactions = await walletService.getTransactions(hostId);
const latestTxn = transactions.transactions[0];
console.log('Latest transaction:', latestTxn);
// Expect: type = 'deposit', amount = booking.totalPrice

// 5. Kiểm tra notification
const notifications = await notificationService.getUserNotifications(hostId);
const latestNotif = notifications.notifications[0];
console.log('Latest notification:', latestNotif);
// Expect: type = 'host_received_payment'
```

---

## 📚 Related Files

- **Services:**
  - `backend/src/services/bookingService.js` - Main booking logic
  - `backend/src/services/walletService.js` - Wallet operations
  - `backend/src/services/notificationService.js` - Notifications

- **Controllers:**
  - `backend/src/controllers/bookingController.js` - API handlers

- **Routes:**
  - `backend/src/routes/bookingRoutes.js` - API endpoints

- **Models:**
  - `backend/src/models/Booking.js`
  - `backend/src/models/Wallet.js`
  - `backend/src/models/Transaction.js`
  - `backend/src/models/Notification.js`

---

## 🚀 Integration với Payment Gateways

### MoMo Callback:

```javascript
// backend/src/controllers/paymentController.js
async momoCallback(req, res) {
  const { orderId, resultCode, amount } = req.body;
  
  if (resultCode == 0) {
    // Payment success
    const bookingId = extractBookingIdFromOrderId(orderId);
    
    // ✅ Cập nhật payment status → Auto transfer to host
    await bookingService.updateBookingPaymentStatus(bookingId, 'paid', {
      paymentTransactionId: req.body.transId,
      paymentMethod: 'momo'
    });
  }
  
  return res.status(200).json({ resultCode: 0, message: 'Success' });
}
```

### VNPay Callback:

```javascript
async vnpayCallback(req, res) {
  const vnpayData = req.query;
  const { response_code, txn_ref } = verifyVNPayPayment(vnpayData);
  
  if (response_code === '00') {
    const bookingId = extractBookingIdFromTxnRef(txn_ref);
    
    // ✅ Cập nhật payment status → Auto transfer to host
    await bookingService.updateBookingPaymentStatus(bookingId, 'paid', {
      paymentTransactionId: txn_ref,
      paymentMethod: 'vnpay'
    });
  }
  
  return res.redirect(`${frontendUrl}/booking-result?success=true`);
}
```

### Wallet Payment:

```javascript
// Khi user thanh toán bằng ví
async payWithWallet(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  
  // Trừ tiền ví user
  await walletService.payment(userId, booking.totalPrice, {
    bookingId: booking._id,
    description: `Thanh toán đơn đặt phòng #${booking._id.toString().slice(-8)}`
  });
  
  // ✅ Cập nhật payment status → Auto transfer to host
  await bookingService.updateBookingPaymentStatus(bookingId, 'paid', {
    paymentMethod: 'wallet'
  });
}
```

---

## ✅ Checklist Triển Khai

- [x] Tạo method `receiveBookingPayment` trong `walletService`
- [x] Tạo method `processHostPayment` trong `bookingService`
- [x] Tạo method `updateBookingPaymentStatus` với auto-trigger
- [x] Thêm notification type `host_received_payment`
- [x] Tạo method `notifyHostReceivedPayment` trong `notificationService`
- [x] Thêm API endpoints `/payment-status` và `/process-host-payment`
- [x] Đảm bảo host có wallet khi đăng ký
- [x] Logging chi tiết cho debugging
- [x] Error handling cho các trường hợp edge
- [ ] Testing end-to-end
- [ ] Tích hợp vào payment callbacks (MoMo/VNPay)
- [ ] Monitoring & alerts cho failed payments

---

## 📞 Support

Nếu có vấn đề:
1. Kiểm tra logs trong console
2. Verify booking.paymentStatus
3. Check host wallet status
4. Review transaction records
5. Contact dev team nếu vẫn không resolve

---

**Last Updated:** 2025-11-26
**Version:** 1.0.0








