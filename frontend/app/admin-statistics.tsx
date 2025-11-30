import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

const screenWidth = Dimensions.get('window').width;

interface RevenueData {
  label: string;
  revenue: number;
  count: number;
}

interface RevenueStats {
  chartData: RevenueData[];
  totalStats: {
    totalRevenue: number;
    totalBookings: number;
    avgRevenue: number;
  };
  revenueByStatus: Array<{
    _id: string;
    revenue: number;
    count: number;
  }>;
  adminWallet: {
    _id: string;
    balance: number;
    status: string;
    user?: {
      username: string;
      email: string;
    };
  } | null;
  maintenanceFeeStats?: {
    totalMaintenanceFees: number;
    count: number;
  };
}

export default function AdminStatisticsScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'day' | 'month'>('month');

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (user?.roleName !== 'admin') {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể truy cập màn hình này', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    loadRevenueStats();
  }, [isAuthenticated, user, period]);

  const loadRevenueStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getRevenueStats({ period });
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        throw new Error(response.message || 'Không thể tải thống kê');
      }
    } catch (error: any) {
      console.error('Error loading revenue stats:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải thống kê');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRevenueStats();
  };

  const formatRevenue = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)}T`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#8b5cf6',
    },
    fillShadowGradient: '#8b5cf6',
    fillShadowGradientOpacity: 0.2,
  };

  const prepareChartData = () => {
    if (!stats || !stats.chartData || stats.chartData.length === 0) {
      return {
        labels: ['Chưa có dữ liệu'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = stats.chartData.map((item) => {
      if (period === 'day') {
        return item.label.split('/')[0]; // Just day
      } else {
        return item.label.split('/')[0]; // Just month
      }
    });

    const data = stats.chartData.map((item) => {
      // Convert to millions for better display
      return item.revenue / 1000000;
    });

    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  if (isLoading && !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Thống Kê & Báo Cáo</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  const chartData = prepareChartData();
  const chartWidth = screenWidth - 64;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Thống Kê & Báo Cáo</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Filter */}
        <View style={styles.filterContainer}>
          {(['day', 'month'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.filterTab, period === p && styles.filterTabActive]}
              onPress={() => setPeriod(p)}
            >
              <ThemedText
                style={[styles.filterText, period === p && styles.filterTextActive]}
                numberOfLines={1}
              >
                {p === 'day' ? 'Theo Ngày' : 'Theo Tháng'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Admin Wallet Card */}
        {stats?.adminWallet && (
          <View style={styles.walletCard}>
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
              style={styles.walletGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.walletHeader}>
                <View>
                  <ThemedText style={styles.walletLabel}>Ví Admin</ThemedText>
                  <ThemedText style={styles.walletBalance}>
                    {new Intl.NumberFormat('vi-VN').format(stats.adminWallet.balance)} VND
                  </ThemedText>
                </View>
                <Ionicons name="wallet" size={40} color="#fff" />
              </View>
              {stats.adminWallet.user && (
                <ThemedText style={styles.walletUser}>
                  {stats.adminWallet.user.username} ({stats.adminWallet.user.email})
                </ThemedText>
              )}
              {stats.maintenanceFeeStats && stats.maintenanceFeeStats.totalMaintenanceFees > 0 && (
                <View style={styles.maintenanceFeeInfo}>
                  <ThemedText style={styles.maintenanceFeeText}>
                    💰 Phí duy trì đã thu: {new Intl.NumberFormat('vi-VN').format(stats.maintenanceFeeStats.totalMaintenanceFees)} VND ({stats.maintenanceFeeStats.count} giao dịch)
                  </ThemedText>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Total Stats Cards */}
        {stats?.totalStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cash" size={32} color="#fff" />
                <ThemedText style={styles.statValue}>
                  {formatRevenue(stats.totalStats.totalRevenue)}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Tổng Doanh Thu</ThemedText>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#0a7ea4', '#0d8bb8']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="calendar" size={32} color="#fff" />
                <ThemedText style={styles.statValue}>
                  {stats.totalStats.totalBookings}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Tổng Đơn Hàng</ThemedText>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#f59e0b', '#f97316']}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="trending-up" size={32} color="#fff" />
                <ThemedText style={styles.statValue}>
                  {formatRevenue(stats.totalStats.avgRevenue)}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Trung Bình/Đơn</ThemedText>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Revenue Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Ionicons name="trending-up" size={24} color="#8b5cf6" />
            <ThemedText style={styles.chartTitle}>Biểu Đồ Doanh Thu</ThemedText>
          </View>
          <View style={styles.chartWrapper}>
            <LineChart
              data={chartData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={true}
              segments={4}
            />
          </View>
          <View style={styles.chartNote}>
            <ThemedText style={styles.noteText}>
              * Đơn vị: Triệu VNĐ
            </ThemedText>
          </View>
        </View>

        {/* Revenue by Status */}
        {stats?.revenueByStatus && stats.revenueByStatus.length > 0 && (
          <View style={styles.statusContainer}>
            <ThemedText style={styles.sectionTitle}>Doanh Thu Theo Trạng Thái</ThemedText>
            {stats.revenueByStatus.map((item) => (
              <View key={item._id} style={styles.statusItem}>
                <View style={styles.statusInfo}>
                  <ThemedText style={styles.statusLabel}>
                    {item._id === 'pending' ? 'Chờ Duyệt' :
                     item._id === 'confirmed' ? 'Đã Xác Nhận' :
                     item._id === 'completed' ? 'Đã Hoàn Thành' :
                     item._id === 'cancelled' ? 'Đã Hủy' : item._id}
                  </ThemedText>
                  <ThemedText style={styles.statusCount}>{item.count} đơn</ThemedText>
                </View>
                <ThemedText style={styles.statusRevenue}>
                  {formatRevenue(item.revenue)}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 50,
    backgroundColor: '#8b5cf6',
    borderBottomWidth: 0,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 0,
  },
  filterTabActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  filterText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  walletCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  walletGradient: {
    padding: 20,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  walletUser: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  maintenanceFeeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  maintenanceFeeText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chart: {
    borderRadius: 16,
  },
  chartNote: {
    marginTop: 8,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 12,
    color: '#555',
  },
  statusRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
});

