# 🏦 Host Wallet UI - Frontend

## Tổng quan

Giao diện ví cho Host được thiết kế riêng để phù hợp với nhu cầu quản lý thu nhập từ đơn đặt phòng.

---

## 📱 Component Structure

```
HostDashboardSection
  ├── Host Header Card
  ├── HostStatsSection
  ├── HostWalletSection ⭐ NEW
  ├── HostQuickActionsSection
  ├── RecentBookingsSection
  └── TopHomestaysSection
```

---

## 🎨 HostWalletSection Features

### 1. **Wallet Card (Gradient)**
```typescript
// Màu gradient: #0a7ea4 → #0d8bb8 → #10a5c7
```

**Hiển thị:**
- 💰 Số dư khả dụng (Balance)
- ✓ Trạng thái hoạt động (Active/Locked)
- 📊 Thống kê:
  - **Đã nhận**: `totalDeposited` (tiền từ bookings)
  - **Đã rút**: `totalWithdrawn` (tiền đã rút về bank)

### 2. **Quick Actions**

| Action | Icon | Color | Route |
|--------|------|-------|-------|
| Lịch sử | 📋 list | Blue | `/wallet-transactions` |
| Rút tiền | 💵 cash | Orange | `/wallet-withdraw` |
| Quản lý | ⚙️ settings | Purple | `/wallet` |

### 3. **Info Banner**
```
💼 Ví Chủ Nhà
Tiền từ các đơn đặt phòng sẽ tự động chuyển vào ví của bạn.
Bạn có thể rút tiền về tài khoản ngân hàng bất cứ lúc nào.
```

---

## 🔄 Data Flow

```
Booking Payment Success
        ↓
Backend Auto Transfer
        ↓
Host Wallet Balance ↑
        ↓
WalletContext.refreshWallet()
        ↓
UI Updates Automatically
        ↓
Host sees new balance! 🎉
```

---

## 💰 Key Differences: User vs Host Wallet

| Feature | User Wallet | Host Wallet |
|---------|-------------|-------------|
| Primary Action | ➕ Nạp tiền | 💵 Rút tiền |
| Stats Label 1 | "Đã nạp" | "Đã nhận" |
| Stats Label 2 | "Đã chi" | "Đã rút" |
| Info Banner | Nạp tiền để thanh toán | Nhận tiền từ bookings |
| Main Purpose | Thanh toán booking | Thu nhập từ hosting |

---

## 📊 UI Layout

```
┌─────────────────────────────────────┐
│  🏠 Wallet Icon    ✓ Hoạt động     │
│                                     │
│  💰 Số dú khả dụng                  │
│  1,500,000 VNĐ                     │
│  ─────────────────────────────────  │
│  🟢 Đã nhận    │   🟠 Đã rút        │
│  2,000,000     │   500,000          │
└─────────────────────────────────────┘

┌───────┐  ┌───────┐  ┌───────┐
│ 📋   │  │ 💵   │  │ ⚙️   │
│ Lịch  │  │ Rút   │  │ Quản  │
│ sử    │  │ tiền  │  │ lý    │
└───────┘  └───────┘  └───────┘

┌─────────────────────────────────────┐
│ ℹ️  💼 Ví Chủ Nhà                   │
│    Tiền từ các đơn đặt phòng sẽ     │
│    tự động chuyển vào ví của bạn... │
└─────────────────────────────────────┘
```

---

## 🎯 Usage Example

### HostDashboardSection.tsx
```typescript
import { HostWalletSection } from './HostWalletSection';

export function HostDashboardSection({ user }: HostDashboardSectionProps) {
  return (
    <View style={styles.container}>
      {/* ... other sections ... */}
      
      {/* Wallet Section */}
      <HostWalletSection />
      
      {/* ... other sections ... */}
    </View>
  );
}
```

### HostWalletSection.tsx
```typescript
import { useWallet } from '@/contexts/WalletContext';

export const HostWalletSection = () => {
  const { wallet, isLoading } = useWallet();
  
  // Hiển thị balance, stats, actions
  return (
    <View>
      <WalletCard balance={wallet?.balance} />
      <QuickActions />
      <InfoBanner />
    </View>
  );
};
```

---

## 🔔 Real-time Updates

Wallet context tự động refresh khi:
1. Screen được focus (`useFocusEffect`)
2. User thực hiện transaction
3. Backend push notification (socket.io)

```typescript
// In index.tsx (Account Screen)
useFocusEffect(
  useCallback(() => {
    if (isAuthenticated) {
      console.log('🔄 Account screen focused, refreshing wallet...');
      refreshWallet();
    }
  }, [isAuthenticated, refreshWallet])
);
```

---

## 🎨 Styling Highlights

### Colors
```typescript
// Gradient
colors: ['#0a7ea4', '#0d8bb8', '#10a5c7']

// Stats Icons
green: '#4ade80'  // Đã nhận (income)
orange: '#fb923c' // Đã rút (withdrawal)

// Action Buttons
blue: ['#3b82f6', '#2563eb']    // Lịch sử
orange: ['#f59e0b', '#d97706']  // Rút tiền
purple: ['#8b5cf6', '#7c3aed']  // Quản lý
```

### Typography
```typescript
// Balance Amount
fontSize: 34
fontWeight: '800'
letterSpacing: 0.5

// Section Title
fontSize: 20
fontWeight: '700'
color: '#0a7ea4'
```

---

## 🧪 Testing Scenarios

### 1. Initial Load
```
✓ Show loading indicator
✓ Fetch wallet data
✓ Display balance and stats
```

### 2. After Booking Payment
```
✓ Backend transfers money to host wallet
✓ Push notification
✓ Wallet context refreshes
✓ UI updates with new balance
✓ Host sees notification
```

### 3. Withdrawal
```
✓ Host clicks "Rút tiền"
✓ Navigate to withdrawal screen
✓ Complete withdrawal
✓ Wallet balance decreases
✓ totalWithdrawn increases
```

### 4. View Transactions
```
✓ Host clicks "Lịch sử"
✓ Navigate to transactions screen
✓ See all deposits from bookings
✓ See all withdrawals
```

---

## 📱 Responsive Design

- **Card**: Border radius 20, elevation 8
- **Actions**: 3 buttons, equal flex, gap 12
- **Stats**: Horizontal layout with divider
- **Banner**: Flexible text with icon

---

## 🔧 Configuration

### Edit Wallet Colors
```typescript
// Change gradient in HostWalletSection.tsx
<LinearGradient
  colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
  // Your custom colors here
/>
```

### Edit Action Buttons
```typescript
// Add/Remove actions in actionsContainer
<TouchableOpacity onPress={() => router.push('/your-route')}>
  <LinearGradient colors={['#color1', '#color2']}>
    <Ionicons name="your-icon" size={24} color="#fff" />
  </LinearGradient>
  <ThemedText>Your Label</ThemedText>
</TouchableOpacity>
```

---

## 📚 Related Files

- **Component**: `frontend/components/account/HostWalletSection.tsx`
- **Dashboard**: `frontend/components/account/HostDashboardSection.tsx`
- **Context**: `frontend/contexts/WalletContext.tsx`
- **Account Screen**: `frontend/app/(tabs)/index.tsx`

---

## 🚀 Features Summary

✅ **Real-time balance updates**  
✅ **Clean, modern UI with gradients**  
✅ **Quick access to common actions**  
✅ **Detailed stats (received/withdrawn)**  
✅ **Informative banner for host guidance**  
✅ **Smooth animations and transitions**  
✅ **Dark mode support**  
✅ **Loading states**  
✅ **Error handling**  
✅ **Auto-refresh on focus**  

---

## 💡 Tips

1. **Refresh wallet** khi màn hình được focus
2. **Hiển thị loading** khi fetch data
3. **Format currency** đúng locale (vi-VN)
4. **Notification** khi có tiền mới vào ví
5. **Easy navigation** đến các tính năng liên quan

---

**Last Updated:** 2025-11-26  
**Version:** 1.0.0








