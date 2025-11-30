import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useWallet } from '@/contexts/WalletContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export const WalletSection = () => {
  const { wallet, isLoading, isRefreshing, refreshWallet } = useWallet();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (isLoading && !wallet) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshWallet} />
      }
    >
      {/* Wallet Card */}
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
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
              {wallet?.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <ThemedText style={styles.balanceLabel}>Số dư khả dụng</ThemedText>
          <ThemedText style={styles.balanceAmount}>
            {formatCurrency(wallet?.balance || 0)}
          </ThemedText>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="arrow-down-circle" size={20} color="#4ade80" />
            <View style={styles.statInfo}>
              <ThemedText style={styles.statLabel}>Đã nạp</ThemedText>
              <ThemedText style={styles.statValue}>
                {formatCurrency(wallet?.totalDeposited || 0)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="arrow-up-circle" size={20} color="#fb923c" />
            <View style={styles.statInfo}>
              <ThemedText style={styles.statLabel}>Đã chi</ThemedText>
              <ThemedText style={styles.statValue}>
                {formatCurrency(wallet?.totalSpent || 0)}
              </ThemedText>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/wallet-deposit')}
        >
          <LinearGradient
            colors={['#22c55e', '#16a34a']}
            style={styles.actionIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add-circle" size={28} color="#fff" />
          </LinearGradient>
          <ThemedText style={styles.actionButtonText}>Nạp tiền</ThemedText>
        </TouchableOpacity>

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
            <Ionicons name="list" size={28} color="#fff" />
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
            <Ionicons name="cash" size={28} color="#fff" />
          </LinearGradient>
          <ThemedText style={styles.actionButtonText}>Rút tiền</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <Ionicons name="information-circle" size={24} color="#0a7ea4" />
        <View style={styles.infoBannerText}>
          <ThemedText style={styles.infoBannerTitle}>
            Ví điện tử Smart Homestay
          </ThemedText>
          <ThemedText style={styles.infoBannerDescription}>
            Nạp tiền vào ví để thanh toán nhanh chóng và nhận nhiều ưu đãi hấp dẫn
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  walletCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  walletStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
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
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
  },
  infoBannerDescription: {
    fontSize: 13,
    opacity: 0.7,
  },
});

