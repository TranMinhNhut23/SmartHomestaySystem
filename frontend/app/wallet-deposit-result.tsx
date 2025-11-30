import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/contexts/WalletContext';

export default function WalletDepositResultScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshWallet } = useWallet();

  const success = params.success === 'true';
  const method = params.method as string;
  const message = params.message as string;
  
  // VNPay trả về amount * 100, MoMo trả về amount gốc
  let amount = 0;
  if (params.amount) {
    const amountParam = parseInt(params.amount as string);
    amount = method === 'vnpay' ? amountParam / 100 : amountParam;
  }

  const [countdown, setCountdown] = React.useState(3);

  useEffect(() => {
    // Refresh wallet khi vào màn hình này
    refreshWallet();
    
    // Nếu thành công, tự động redirect về trang Tài khoản sau 3 giây
    if (success) {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            router.replace('/(tabs)'); // Redirect về tab Tài khoản
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    }
  }, [success]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={success ? ['#22c55e', '#16a34a'] : ['#ef4444', '#dc2626']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.backButton} />
          <ThemedText style={styles.headerTitle}>Kết quả nạp tiền</ThemedText>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.resultCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: success ? '#22c55e20' : '#ef444420' },
            ]}
          >
            <Ionicons
              name={success ? 'checkmark-circle' : 'close-circle'}
              size={80}
              color={success ? '#22c55e' : '#ef4444'}
            />
          </View>

          {/* Status */}
          <ThemedText style={styles.statusTitle}>
            {success ? 'Nạp tiền thành công!' : 'Nạp tiền thất bại'}
          </ThemedText>

          {/* Amount */}
          {success && amount > 0 && (
            <ThemedText style={[styles.amount, { color: '#22c55e' }]}>
              {formatCurrency(amount)}
            </ThemedText>
          )}

          {/* Message */}
          {message && (
            <ThemedText style={styles.message}>
              {decodeURIComponent(message.replace(/\+/g, ' '))}
            </ThemedText>
          )}

          {/* Method */}
          {method && (
            <View style={styles.methodContainer}>
              <ThemedText style={styles.methodLabel}>Phương thức:</ThemedText>
              <ThemedText style={styles.methodValue}>
                {method.toUpperCase()}
              </ThemedText>
            </View>
          )}

          {/* Description */}
          <ThemedText style={styles.description}>
            {success
              ? 'Số tiền đã được cộng vào ví của bạn. Bạn có thể sử dụng để thanh toán các đơn đặt phòng.'
              : 'Giao dịch không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu cần.'}
          </ThemedText>

          {/* Auto redirect countdown */}
          {success && countdown > 0 && (
            <View style={styles.countdownContainer}>
              <ThemedText style={styles.countdownText}>
                Tự động quay về trong {countdown}s...
              </ThemedText>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {success ? (
            // Nếu thành công, hiện nút quay về ngay
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => router.replace('/(tabs)')}
            >
              <LinearGradient
                colors={['#0a7ea4', '#0d8bb8']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="home" size={24} color="#fff" />
                <ThemedText style={styles.actionButtonPrimaryText}>Quay về ngay</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            // Nếu thất bại, hiện các options khác
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                onPress={() => router.replace('/wallet-deposit')}
              >
                <Ionicons name="refresh" size={24} color="#22c55e" />
                <ThemedText style={styles.actionButtonText}>Thử lại</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                onPress={() => router.replace('/(tabs)')}
              >
                <Ionicons name="home" size={24} color="#0a7ea4" />
                <ThemedText style={styles.actionButtonText}>Về trang chủ</ThemedText>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
            onPress={() => router.push('/wallet-transactions')}
          >
            <Ionicons name="list" size={24} color="#0a7ea4" />
            <ThemedText style={styles.actionButtonText}>Xem lịch sử</ThemedText>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  resultCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  methodLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  methodValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  countdownContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    marginTop: 8,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a7ea4',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonPrimary: {
    minWidth: '100%',
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

