# 💸 Host Wallet Refund Flow

## Tổng quan

Khi host **approve refund request**, tiền sẽ được:
1. ❌ **Trừ từ ví host** (vì host đã nhận tiền từ booking)
2. ✅ **Chuyển vào ví user**

**Lý do:** Host đã nhận tiền từ booking vào ví. Khi hoàn tiền, host phải trả lại cho khách.

---

## 🔄 Flow chi tiết

### 1. **User gửi yêu cầu hoàn tiền**

```
User → Frontend → Backend
POST /api/bookings/:id/request-refund
{
  "reason": "Không thể đi vào thời điểm này"
}
```

**Backend xử lý:**
- Kiểm tra điều kiện (paid + confirmed)
- Tạo refund request
- Update booking: `refundRequest.requested = true`

---

### 2. **Host xem và duyệt yêu cầu**

```
Host → Frontend (host-refund-requests.tsx)
- Xem danh sách yêu cầu
- Tap vào request để xem chi tiết
- Hệ thống tự động tính:
  ✓ Refund percentage dựa trên thời gian
  ✓ Refund amount = totalPrice × percentage
```

**Frontend warning:**
```
⚠️ Số tiền XXX VNĐ sẽ được trừ từ ví của bạn
   và chuyển cho khách hàng.
```

---

### 3. **Backend xử lý approval**

```javascript
// bookingService.processHostRefundRequest()

// Step 1: Calculate refund
const refundPercentage = booking.calculateRefundPercentage('guest');
const refundAmount = totalPrice × (refundPercentage / 100);

// Step 2: Deduct from host wallet ❌
await walletService.withdraw(hostId, refundAmount, {
  status: 'completed',
  description: 'Hoàn tiền cho khách - Booking #xxx'
});

// Step 3: Deposit to user wallet ✅
await walletService.deposit(guestId, refundAmount, {
  status: 'completed',
  description: 'Hoàn tiền booking #xxx'
});

// Step 4: Update booking
booking.status = 'cancelled';
booking.refund.status = 'completed';
```

---

## 💰 Wallet Transactions

### Host Wallet Transaction

```javascript
{
  type: 'withdraw',
  amount: -500000,  // Negative (trừ tiền)
  balanceBefore: 1000000,
  balanceAfter: 500000,
  status: 'completed',
  paymentMethod: 'wallet',  // Internal wallet transfer
  description: 'Hoàn tiền cho khách - Booking #xxx (50%)',
  metadata: {
    bookingId: '...',
    refundPercentage: 50,
    guestId: '...',
    source: 'host_refund_to_guest',
    transactionType: 'refund_withdrawal'
  }
}
```

### User Wallet Transaction

```javascript
{
  type: 'deposit',
  amount: 500000,  // Positive (cộng tiền)
  balanceBefore: 0,
  balanceAfter: 500000,
  status: 'completed',
  paymentMethod: 'wallet',  // Internal wallet transfer
  description: 'Hoàn tiền booking #xxx (50%)',
  metadata: {
    bookingId: '...',
    refundPercentage: 50,
    hostId: '...',
    source: 'host_approved_refund',
    transactionType: 'refund_deposit'
  }
}
```

---

## 📋 Refund Rules

### Khách hủy (Guest Cancellation)

| Thời gian trước Check-in | Tỉ lệ hoàn | Ví dụ (1M VNĐ) |
|--------------------------|------------|----------------|
| ≥ 7 ngày                 | 100%       | 1,000,000 VNĐ  |
| 3-6 ngày                 | 50%        | 500,000 VNĐ    |
| 1-2 ngày                 | 25%        | 250,000 VNĐ    |
| < 1 ngày                 | 0%         | 0 VNĐ          |

### Chủ nhà hủy (Host Cancellation)
- **Bất kỳ lúc nào**: 100% (+ penalty cho host)

---

## 🚨 Error Handling

### Host không đủ tiền trong ví

```javascript
try {
  await walletService.withdraw(hostId, refundAmount, {...});
} catch (hostWithdrawError) {
  throw new Error('Không thể trừ tiền từ ví host. Vui lòng kiểm tra số dư.');
}
```

**Frontend hiển thị:**
```
❌ Lỗi: Số dư ví không đủ để hoàn tiền.
   Vui lòng nạp thêm tiền vào ví.
```

**Host action:**
1. Nạp thêm tiền vào ví
2. Thử approve lại

---

## 💡 Why deduct from host wallet?

### Logic flow đầy đủ:

```
1. User thanh toán booking
   → User wallet: -1M
   → Booking: paid

2. Backend auto-transfer to host
   → Host wallet: +1M
   → Host has the money

3. User request refund
   → Pending approval

4. Host approve 50% refund
   → Host wallet: -500K  (return to user)
   → User wallet: +500K
   → Host keeps: 500K (compensation)
```

**Nếu KHÔNG trừ từ ví host:**
- Host giữ 100% tiền (1M)
- User nhận lại 50% (500K)
- **Total = 1.5M** ❌ Không hợp lý!

**Khi trừ từ ví host:**
- Host giữ 50% tiền (500K)
- User nhận lại 50% (500K)
- **Total = 1M** ✅ Đúng!

---

## 🎯 Test Cases

### TC1: Host có đủ tiền - Approve 100%

**Setup:**
- Booking: 1,000,000 VNĐ
- Host wallet: 1,500,000 VNĐ
- Days until check-in: 10 days

**Action:** Host approve

**Expected:**
- ✅ Host wallet: 1,500,000 → 500,000 (-1,000,000)
- ✅ User wallet: 0 → 1,000,000 (+1,000,000)
- ✅ Booking status: cancelled
- ✅ Refund status: completed

---

### TC2: Host có đủ tiền - Approve 50%

**Setup:**
- Booking: 1,000,000 VNĐ
- Host wallet: 1,500,000 VNĐ
- Days until check-in: 4 days

**Action:** Host approve

**Expected:**
- ✅ Host wallet: 1,500,000 → 1,000,000 (-500,000)
- ✅ User wallet: 0 → 500,000 (+500,000)
- ✅ Booking status: cancelled
- ✅ Refund percentage: 50%

---

### TC3: Host KHÔNG đủ tiền

**Setup:**
- Booking: 1,000,000 VNĐ
- Host wallet: 200,000 VNĐ (< refund amount)
- Days until check-in: 10 days

**Action:** Host approve

**Expected:**
- ❌ Error: "Không thể trừ tiền từ ví host. Vui lòng kiểm tra số dư."
- ✅ Booking unchanged
- ✅ User wallet unchanged
- ✅ Frontend shows error alert

**Fix:** Host nạp thêm 800K vào ví → Thử lại

---

### TC4: Host reject

**Setup:**
- Booking: 1,000,000 VNĐ
- Host wallet: 1,500,000 VNĐ

**Action:** Host reject with reason "Không đủ điều kiện"

**Expected:**
- ✅ Host wallet: Unchanged (1,500,000)
- ✅ User wallet: Unchanged
- ✅ Refund status: rejected
- ✅ Booking status: Still confirmed (NOT cancelled)

---

## 🔐 Security

### Checks performed:

1. **Ownership check:** Host can only process refunds for their own homestays
2. **Status check:** Can only approve pending requests
3. **Balance check:** Host must have enough balance
4. **Duplicate check:** Cannot process the same request twice

---

## 📊 Database Impact

### Before Approval:

```javascript
{
  _id: '...',
  status: 'confirmed',
  paymentStatus: 'paid',
  totalPrice: 1000000,
  refundRequest: {
    requested: true,
    requestReason: '...'
  },
  refund: {
    status: 'pending'
  }
}

Host Wallet: 1,500,000
User Wallet: 0
```

### After Approval (50%):

```javascript
{
  _id: '...',
  status: 'cancelled',
  paymentStatus: 'paid',
  totalPrice: 1000000,
  refundRequest: {
    requested: true,
    requestReason: '...',
    processedBy: hostId,
    adminNote: 'Đã được host chấp nhận'
  },
  refund: {
    status: 'completed',
    amount: 500000,
    percentage: 50,
    processedAt: Date,
    transactionId: '...'
  },
  cancelledBy: hostId,
  cancelledAt: Date
}

Host Wallet: 1,000,000 (-500K)
User Wallet: 500,000 (+500K)

Host Transactions: +1 (withdraw)
User Transactions: +1 (deposit/refund)
```

---

## 🔔 Notifications

**Sent to user after approval:**

```javascript
{
  type: 'refund_processed',
  title: 'Hoàn tiền thành công',
  message: 'Bạn đã được hoàn 500,000 VNĐ từ booking #xxx',
  priority: 'high'
}
```

---

## 📱 Frontend Messages

### Confirmation Dialog (Approve):

```
⚠️ Số tiền 500,000 VNĐ sẽ được trừ từ ví của bạn
   và chuyển cho khách hàng.

📋 Thông tin:
• Khách hàng: Nguyễn Văn A
• Homestay: Villa Đà Lạt
• Số tiền gốc: 1,000,000 VNĐ
• Hoàn tiền: 50% = 500,000 VNĐ

💬 Lý do: Không thể đi vào thời điểm này

Bạn có chắc chắn muốn tiếp tục?

[Hủy]  [Đồng ý]
```

### Success Alert:

```
✅ Đã hoàn tiền thành công!

• Tiền đã được trừ từ ví của bạn
• Tiền đã được chuyển vào ví khách hàng  
• Booking đã được hủy

[OK]
```

---

## 🛠️ Implementation Files

### Backend:
- `backend/src/services/bookingService.js` - `processHostRefundRequest()`
- `backend/src/models/Booking.js` - `calculateRefundPercentage()`
- `backend/src/services/walletService.js` - `withdraw()`, `deposit()`

### Frontend:
- `frontend/app/host-refund-requests.tsx` - UI & logic
- `frontend/services/api.ts` - API methods

---

## 📝 Changelog

- **2025-11-27**: Changed refund flow to deduct from host wallet instead of system wallet
- **2025-11-27**: Updated refund rules: 7d/3d/1d thresholds with 100%/50%/25%/0%

---

**Last Updated:** 2025-11-27  
**Version:** 2.0.0  
**Breaking Change:** Refunds now deduct from host wallet

