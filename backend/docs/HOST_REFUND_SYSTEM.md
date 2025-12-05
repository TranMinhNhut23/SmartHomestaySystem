# 🏦 Host Refund Management System

## Tổng quan

Hệ thống cho phép **Host duyệt/từ chối yêu cầu hoàn tiền** từ khách hàng, đảm bảo tuân thủ quy tắc hoàn tiền đã định.

---

## 📋 Quy tắc hoàn tiền

### Khách hàng hủy (Guest Cancellation)

| Thời gian trước Check-in | Tỉ lệ hoàn tiền |
|--------------------------|-----------------|
| ≥ 7 ngày                 | 100%            |
| 3-6 ngày                 | 50%             |
| 1-2 ngày                 | 25%             |
| < 1 ngày                 | 0%              |

### Chủ nhà hủy (Host Cancellation)
- **Bất kỳ thời điểm nào**: 100% + penalty cho host

---

## 🔄 Workflow

```
1. User gửi yêu cầu hoàn tiền
   ↓
2. Host xem yêu cầu trong "Duyệt Hoàn Tiền"
   ↓
3. Host approve/reject
   ↓ (nếu approve)
4. Tính toán số tiền hoàn dựa trên quy tắc
   ↓
5. Chuyển tiền vào ví user
   ↓
6. Gửi notification cho user
   ↓
7. Cập nhật booking status = 'cancelled'
```

---

## 🔌 Backend API

### 1. **Get Host Refund Requests**

```http
GET /api/bookings/host-refund-requests
Authorization: Bearer {hostToken}
```

**Query Params:**
- `status`: `pending` | `completed` | `rejected` (default: `pending`)
- `page`: Number (default: 1)
- `limit`: Number (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "_id": "...",
        "homestay": {...},
        "room": {...},
        "guest": {...},
        "totalPrice": 1000000,
        "refundRequest": {
          "requested": true,
          "requestedAt": "2025-11-27...",
          "requestReason": "Không thể đi vào thời điểm này"
        },
        "refund": {
          "status": "pending"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### 2. **Process Host Refund Request**

```http
POST /api/bookings/:bookingId/process-host-refund
Authorization: Bearer {hostToken}
Content-Type: application/json
```

**Body:**
```json
{
  "action": "approve" | "reject",
  "adminNote": "Lý do (tùy chọn)"
}
```

**Response (Approve):**
```json
{
  "success": true,
  "message": "Đã chấp nhận yêu cầu hoàn tiền",
  "data": {
    "success": true,
    "refundAmount": 500000,
    "message": "Đã chấp nhận yêu cầu hoàn tiền"
  }
}
```

**Response (Reject):**
```json
{
  "success": true,
  "message": "Đã từ chối yêu cầu hoàn tiền",
  "data": {
    "success": true,
    "message": "Đã từ chối yêu cầu hoàn tiền"
  }
}
```

---

## 📱 Frontend Implementation

### 1. **Màn hình: host-refund-requests.tsx**

**Location:** `frontend/app/host-refund-requests.tsx`

**Features:**
- ✅ 3 tabs: Chờ duyệt / Đã duyệt / Đã từ chối
- ✅ Hiển thị thông tin đầy đủ: homestay, guest, booking details
- ✅ Tính toán **tự động** tỉ lệ hoàn tiền dựa trên thời gian
- ✅ Preview số tiền hoàn trước khi approve
- ✅ Nút Approve/Reject với confirmation
- ✅ Pull-to-refresh
- ✅ Loading states
- ✅ Empty states

**UI Components:**
```tsx
// Header
<LinearGradient colors={['#f59e0b', '#d97706', '#b45309']}>
  Yêu cầu hoàn tiền
</LinearGradient>

// Tabs
[Chờ duyệt] [Đã duyệt] [Đã từ chối]

// Request Card (Collapsed)
[Image] Homestay Name
        👤 Guest Name
        📅 Request Date

// Request Card (Expanded)
📋 Thông tin khách hàng
🏠 Thông tin đặt phòng
💰 Thông tin hoàn tiền
   - Tỉ lệ hoàn: 50%
   - Số tiền hoàn: 500,000 VNĐ

[Từ chối]  [Chấp nhận]
```

---

### 2. **Quick Action Button**

**Location:** `frontend/components/account/HostQuickActionsSection.tsx`

Đã thêm button "Duyệt Hoàn Tiền" với:
- Icon: `cash`
- Gradient: `['#ef4444', '#dc2626']`
- Route: `/host-refund-requests`

---

## 💻 Backend Service Methods

### `bookingService.getHostRefundRequests(hostId, options)`

```javascript
// Lấy refund requests cho homestays của host
const result = await bookingService.getHostRefundRequests(hostId, {
  status: 'pending',
  page: 1,
  limit: 20
});
```

---

### `bookingService.processHostRefundRequest(bookingId, hostId, action, adminNote)`

```javascript
// Approve
await bookingService.processHostRefundRequest(
  bookingId,
  hostId,
  'approve',
  'Chấp nhận hoàn tiền theo quy định'
);

// Reject
await bookingService.processHostRefundRequest(
  bookingId,
  hostId,
  'reject',
  'Không đủ điều kiện hoàn tiền'
);
```

**Approve Process:**
1. Tính refund percentage dựa trên thời gian
2. Tính refund amount = totalPrice * percentage
3. Cập nhật booking:
   - `refund.status` = `'completed'`
   - `refund.amount` = calculated amount
   - `status` = `'cancelled'`
4. Deposit tiền vào wallet user
5. Gửi notification
6. Trả về kết quả

**Reject Process:**
1. Cập nhật booking:
   - `refund.status` = `'rejected'`
   - `refund.reason` = adminNote
2. Trả về kết quả

---

## 🧪 Testing

### Test Case 1: Approve Refund (≥ 7 days before check-in)

```bash
# Expected: 100% refund
```

1. User request refund
2. Host approve
3. Check:
   - ✅ User wallet increased by 100% of totalPrice
   - ✅ Booking status = 'cancelled'
   - ✅ Notification sent to user

---

### Test Case 2: Approve Refund (3-6 days before check-in)

```bash
# Expected: 50% refund
```

1. User request refund
2. Host approve
3. Check:
   - ✅ User wallet increased by 50% of totalPrice

---

### Test Case 3: Reject Refund

```bash
# Expected: No money refunded
```

1. User request refund
2. Host reject with reason
3. Check:
   - ✅ User wallet unchanged
   - ✅ Booking refund.status = 'rejected'
   - ✅ Booking still confirmed (not cancelled)

---

### Test Case 4: Multiple Requests

```bash
# Expected: Host sees all pending requests
```

1. 3 users request refunds
2. Host opens refund screen
3. Check:
   - ✅ All 3 requests appear in "Chờ duyệt" tab
   - ✅ Correct guest info displayed
   - ✅ Correct refund percentage calculated

---

## 📊 Database Changes

### Booking Model Updates

```javascript
{
  refund: {
    status: 'pending' | 'completed' | 'rejected',
    amount: Number,
    percentage: Number,
    reason: String,
    processedAt: Date,
    transactionId: ObjectId
  },
  refundRequest: {
    requested: Boolean,
    requestedAt: Date,
    requestReason: String,
    requestedBy: ObjectId,
    adminNote: String,
    processedBy: ObjectId
  },
  status: 'cancelled', // When refund approved
  cancelledBy: ObjectId,
  cancelledAt: Date
}
```

---

## 🔔 Notifications

Khi host approve refund:

```javascript
await notificationService.notifyRefundProcessed(
  bookingId,
  userId,
  refundAmount
);
```

**Notification details:**
- Type: `refund_processed`
- Title: "Hoàn tiền thành công"
- Message: `"Bạn đã được hoàn ${amount} VNĐ..."`
- Priority: `high`

---

## 🚨 Error Handling

### Common Errors:

1. **Không có quyền xử lý**
```
"Bạn không có quyền xử lý yêu cầu hoàn tiền này"
```

2. **Không có yêu cầu hoàn tiền**
```
"Không có yêu cầu hoàn tiền cho booking này"
```

3. **Đã được xử lý**
```
"Yêu cầu hoàn tiền đã được xử lý"
```

4. **Action không hợp lệ**
```
"Action không hợp lệ. Chỉ chấp nhận 'approve' hoặc 'reject'"
```

---

## 🔐 Security

### Authorization Checks:

1. **Routes Protected:** All host refund routes require `authorize('host')`
2. **Ownership Check:** Host can only process refunds for their own homestays
3. **Status Check:** Can only process requests with `status = 'pending'`

---

## 💡 Best Practices

1. **Always calculate refund percentage** based on current date vs check-in date
2. **Preview refund amount** to host before approval
3. **Log all refund actions** for audit trail
4. **Send notifications** to keep users informed
5. **Handle wallet transactions** atomically (with try-catch)

---

## 🎯 Usage Example

```typescript
// Frontend
import { apiService } from '@/services/api';

// Get pending refund requests
const requests = await apiService.getHostRefundRequests({
  status: 'pending',
  page: 1,
  limit: 20
});

// Approve refund
await apiService.processHostRefund(
  bookingId,
  'approve',
  'Chấp nhận theo quy định'
);

// Reject refund
await apiService.processHostRefund(
  bookingId,
  'reject',
  'Không đủ điều kiện'
);
```

---

## 📝 Changelog

- **2025-11-27**: Initial implementation
  - Backend API for host refund management
  - Frontend screen with 3 tabs
  - Quick action button in host dashboard
  - Auto-calculate refund percentage
  - Wallet integration
  - Notification system

---

## 🔗 Related Documentation

- [Refund Request (User)](./REFUND_REQUEST.md)
- [Host Wallet Payment](./HOST_WALLET_PAYMENT.md)
- [Booking Service](./BOOKING_SERVICE.md)

---

**Last Updated:** 2025-11-27  
**Version:** 1.0.0













