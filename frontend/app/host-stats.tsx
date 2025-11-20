import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { HostStatsCharts } from '@/components/account/HostStatsCharts';

interface Stats {
  totalHomestays: number;
  totalRooms: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  activeBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyBookings: number;
  occupancyRate: number;
}

export default function HostStatsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalHomestays: 0,
    totalRooms: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    activeBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    monthlyBookings: 0,
    occupancyRate: 0,
  });
  const [monthlyData, setMonthlyData] = useState<
    Array<{ month: string; bookings: number; revenue: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // Fetch homestays
      const homestaysRes = await apiService.getHostHomestays({ limit: 1000 });
      const homestays = homestaysRes.success
        ? (Array.isArray(homestaysRes.data) ? homestaysRes.data : [])
        : [];
      const totalHomestays = homestays.length;

      // Calculate total rooms
      let totalRooms = 0;
      homestays.forEach((homestay: any) => {
        if (homestay.rooms && Array.isArray(homestay.rooms)) {
          totalRooms += homestay.rooms.length;
        } else if (homestay.rooms && typeof homestay.rooms === 'object') {
          Object.values(homestay.rooms).forEach((roomGroup: any) => {
            if (roomGroup.quantity) {
              totalRooms += roomGroup.quantity;
            }
          });
        }
      });

      // Fetch bookings
      const bookingsRes = await apiService.getHostBookings({ limit: 1000 });
      const bookings = bookingsRes.success
        ? (bookingsRes.data?.bookings || bookingsRes.data || [])
        : [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter bookings by status
      const totalBookings = Array.isArray(bookings) ? bookings.length : 0;
      const pendingBookings = Array.isArray(bookings)
        ? bookings.filter((b: any) => b.status === 'pending').length
        : 0;
      const confirmedBookings = Array.isArray(bookings)
        ? bookings.filter((b: any) => b.status === 'confirmed').length
        : 0;
      const completedBookings = Array.isArray(bookings)
        ? bookings.filter((b: any) => b.status === 'completed').length
        : 0;

      // Active bookings
      const activeBookings = Array.isArray(bookings)
        ? bookings.filter((b: any) => {
            if (b.status !== 'confirmed' && b.status !== 'completed') return false;
            const checkIn = b.checkIn ? new Date(b.checkIn) : null;
            const checkOut = b.checkOut ? new Date(b.checkOut) : null;
            if (!checkIn || !checkOut) return false;
            return checkIn <= now && checkOut >= now;
          }).length
        : 0;

      // Monthly bookings
      const monthlyBookings = Array.isArray(bookings)
        ? bookings.filter((b: any) => {
            const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
            return bookingDate && bookingDate >= startOfMonth;
          }).length
        : 0;

      // Calculate revenue
      const confirmedCompletedBookings = Array.isArray(bookings)
        ? bookings.filter(
            (b: any) => b.status === 'confirmed' || b.status === 'completed'
          )
        : [];
      const totalRevenue = confirmedCompletedBookings.reduce((sum: number, b: any) => {
        return sum + (b.totalPrice || 0);
      }, 0);

      // Monthly revenue
      const monthlyBookingsForRevenue = confirmedCompletedBookings.filter((b: any) => {
        const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
        return bookingDate && bookingDate >= startOfMonth;
      });
      const monthlyRevenue = monthlyBookingsForRevenue.reduce((sum: number, b: any) => {
        return sum + (b.totalPrice || 0);
      }, 0);

      // Calculate occupancy rate
      const occupancyRate =
        totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0;

      // Calculate monthly data for charts (last 6 months)
      const monthlyDataArray: Array<{ month: string; bookings: number; revenue: number }> = [];
      const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const monthBookings = Array.isArray(bookings)
          ? bookings.filter((b: any) => {
              const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
              return bookingDate && bookingDate >= monthStart && bookingDate <= monthEnd;
            }).length
          : 0;

        const monthRevenue = confirmedCompletedBookings
          .filter((b: any) => {
            const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
            return bookingDate && bookingDate >= monthStart && bookingDate <= monthEnd;
          })
          .reduce((sum: number, b: any) => sum + (b.totalPrice || 0), 0);

        monthlyDataArray.push({
          month: monthNames[date.getMonth()],
          bookings: monthBookings,
          revenue: monthRevenue,
        });
      }

      setStats({
        totalHomestays,
        totalRooms,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        activeBookings,
        totalRevenue,
        monthlyRevenue,
        monthlyBookings,
        occupancyRate,
      });
      setMonthlyData(monthlyDataArray);
    } catch (error) {
      console.error('Error loading host stats:', error);
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>Thống Kê Chi Tiết</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Thống Kê Chi Tiết</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Ionicons name="business" size={24} color="#0a7ea4" />
            <ThemedText style={styles.summaryValue}>{stats.totalHomestays}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Homestay</ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar" size={24} color="#6366f1" />
            <ThemedText style={styles.summaryValue}>{stats.totalBookings}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Tổng Đơn</ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="cash" size={24} color="#10b981" />
            <ThemedText style={styles.summaryValue}>{formatRevenue(stats.totalRevenue)}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Doanh Thu</ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="bar-chart" size={24} color="#8b5cf6" />
            <ThemedText style={styles.summaryValue}>{stats.occupancyRate}%</ThemedText>
            <ThemedText style={styles.summaryLabel}>Tỷ Lệ Lấp Đầy</ThemedText>
          </View>
        </View>

        {/* Charts */}
        <HostStatsCharts stats={stats} monthlyData={monthlyData} />
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#11181C',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
});


