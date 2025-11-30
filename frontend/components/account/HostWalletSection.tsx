import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useWallet } from '@/contexts/WalletContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export const HostWalletSection = () => {
  const { wallet, isLoading, error } = useWallet();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Debug logging
  console.log('🏦 HostWalletSection render:');
  console.log('  - isLoading:', isLoading);
  console.log('  - wallet:', wallet ? 'exists' : 'null');
  console.log('  - error:', error);
  if (wallet) {
    console.log('  - wallet balance:', wallet.balance);
    console.log('  - wallet status:', wallet.status);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (isLoading && !wallet) {
    console.log('🔄 HostWalletSection: Showing loading...');
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error && !wallet) {
    console.log('❌ HostWalletSection: Error -', error);
    return (
      <View style={styles.container}>
        <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Ionicons name="alert-circle" size={24} color="#ef4444" />
          <View style={styles.infoBannerText}>
            <ThemedText style={[styles.infoBannerTitle, { color: '#ef4444' }]}>
              Lỗi tải ví
            </ThemedText>
            <ThemedText style={styles.infoBannerDescription}>
              {error}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  console.log('✅ HostWalletSection: Rendering wallet UI');

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleContainer}>
          <Ionicons name="wallet" size={24} color="#0a7ea4" />
          <ThemedText style={styles.sectionTitle}>Ví của tôi</ThemedText>
        </View>
      </View>

      {/* Wallet Card */}
      <LinearGradient
        colors={['#0d8bb8', '#10a5c7', '#14b8d4']}
        style={styles.walletCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.walletHeader}>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet" size={32} color="#fff" />
          </View>
          <View style={styles.walletStatus}>
            <ThemedText style={styles.walletStatusText}>
              {wallet?.status === 'active' ? '✓ Hoạt động' : '🔒 Bị khóa'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <ThemedText style={styles.balanceLabel}>💰 Số dư khả dụng</ThemedText>
          <ThemedText style={styles.balanceAmount}>
            {formatCurrency(wallet?.balance || 0)}
          </ThemedText>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-down-circle" size={20} color="#4ade80" />
            <View style={styles.statInfo}>
              <ThemedText style={styles.statLabel}>Đã nhận</ThemedText>
              <ThemedText style={styles.statValue}>
                {formatCurrency(wallet?.totalDeposited || 0)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="arrow-up-circle" size={20} color="#fb923c" />
            <View style={styles.statInfo}>
              <ThemedText style={styles.statLabel}>Đã rút</ThemedText>
              <ThemedText style={styles.statValue}>
                {formatCurrency(wallet?.totalWithdrawn || 0)}
              </ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/wallet-transactions')}
        >
          <LinearGradient
            colors={['#3b82f6', '#2563eb']}
            style={styles.actionIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="list" size={24} color="#fff" />
          </LinearGradient>
          <ThemedText style={styles.actionButtonText}>Lịch sử</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/wallet-withdraw')}
        >
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.actionIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="cash" size={24} color="#fff" />
          </LinearGradient>
          <ThemedText style={styles.actionButtonText}>Rút tiền</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/wallet')}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.actionIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="settings" size={24} color="#fff" />
          </LinearGradient>
          <ThemedText style={styles.actionButtonText}>Quản lý</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <Ionicons name="information-circle" size={24} color="#0a7ea4" />
        <View style={styles.infoBannerText}>
          <ThemedText style={styles.infoBannerTitle}>
            💼 Ví Chủ Nhà
          </ThemedText>
          <ThemedText style={styles.infoBannerDescription}>
            Tiền từ các đơn đặt phòng sẽ tự động chuyển vào ví của bạn. Bạn có thể rút tiền về tài khoản ngân hàng bất cứ lúc nào.
          </ThemedText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a7ea4',
    letterSpacing: 0.2,
  },
  walletCard: {
    borderRadius: 18,
    padding: 18,
    elevation: 6,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  walletIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletStatus: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  walletStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  balanceContainer: {
    marginBottom: 18,
  },
  balanceLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statInfo: {
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoBannerText: {
    flex: 1,
    gap: 4,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  infoBannerDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
});


