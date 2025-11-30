import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/contexts/WalletContext';

const TRANSACTION_TYPES = {
  deposit: { label: 'Nạp tiền', icon: 'arrow-down-circle', color: '#22c55e' },
  withdraw: { label: 'Rút tiền', icon: 'arrow-up-circle', color: '#f59e0b' },
  payment: { label: 'Thanh toán', icon: 'card', color: '#ef4444' },
  refund: { label: 'Hoàn tiền', icon: 'refresh-circle', color: '#3b82f6' },
  bonus: { label: 'Thưởng', icon: 'gift', color: '#8b5cf6' },
};

const TRANSACTION_STATUS = {
  pending: { label: 'Đang xử lý', color: '#f59e0b' },
  completed: { label: 'Hoàn tất', color: '#22c55e' },
  failed: { label: 'Thất bại', color: '#ef4444' },
  cancelled: { label: 'Đã hủy', color: '#6b7280' },
};

export default function WalletTransactionsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { transactions, pagination, isLoading, fetchTransactions } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderTransaction = (transaction: any) => {
    const typeInfo = TRANSACTION_TYPES[transaction.type as keyof typeof TRANSACTION_TYPES];
    const statusInfo = TRANSACTION_STATUS[transaction.status as keyof typeof TRANSACTION_STATUS];
    const isPositive = transaction.type === 'deposit' || transaction.type === 'refund' || transaction.type === 'bonus';

    return (
      <TouchableOpacity
        key={transaction._id}
        style={[styles.transactionCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={[styles.transactionIcon, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name={typeInfo.icon as any} size={24} color={typeInfo.color} />
            </View>
            <View style={styles.transactionDetails}>
              <ThemedText style={styles.transactionType}>{typeInfo.label}</ThemedText>
              <ThemedText style={styles.transactionDate}>
                {formatDate(transaction.createdAt)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <ThemedText
              style={[
                styles.transactionAmount,
                { color: isPositive ? '#22c55e' : '#ef4444' },
              ]}
            >
              {isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
              <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </ThemedText>
            </View>
          </View>
        </View>

        {transaction.description && (
          <ThemedText style={styles.transactionDescription}>
            {transaction.description}
          </ThemedText>
        )}

        {transaction.paymentMethod && (
          <View style={styles.transactionMeta}>
            <Ionicons name="card-outline" size={14} color={isDark ? '#999' : '#666'} />
            <ThemedText style={styles.transactionMetaText}>
              {transaction.paymentMethod.toUpperCase()}
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Lịch sử giao dịch</ThemedText>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      {isLoading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
          <ThemedText style={styles.emptyText}>Chưa có giao dịch nào</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Lịch sử giao dịch của bạn sẽ hiển thị tại đây
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Summary */}
          {pagination && (
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Tổng giao dịch</ThemedText>
                <ThemedText style={styles.summaryValue}>{pagination.total}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Trang</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {pagination.page}/{pagination.totalPages}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Transactions List */}
          <View style={styles.transactionsList}>
            {transactions.map((transaction) => renderTransaction(transaction))}
          </View>

          {/* Load More */}
          {pagination && pagination.page < pagination.totalPages && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
              onPress={() => fetchTransactions(pagination.page + 1)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0a7ea4" />
              ) : (
                <>
                  <Ionicons name="arrow-down" size={20} color="#0a7ea4" />
                  <ThemedText style={styles.loadMoreText}>Xem thêm</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    gap: 4,
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 13,
    opacity: 0.7,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  transactionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionMetaText: {
    fontSize: 12,
    opacity: 0.7,
  },
  loadMoreButton: {
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
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
});


