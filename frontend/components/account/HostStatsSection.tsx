import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '@/services/api';

interface User {
  _id: string;
}

interface HostStatsSectionProps {
  user: User;
}

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

export function HostStatsSection({ user }: HostStatsSectionProps) {
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
      
      // Calculate total rooms from all homestays
      let totalRooms = 0;
      homestays.forEach((homestay: any) => {
        if (homestay.rooms && Array.isArray(homestay.rooms)) {
          totalRooms += homestay.rooms.length;
        } else if (homestay.rooms && typeof homestay.rooms === 'object') {
          // If rooms is an object with quantity
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
      
      // Active bookings (confirmed and check-in date is in the past, check-out is in the future)
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

      // Calculate occupancy rate (simplified: active bookings / total rooms * 100)
      const occupancyRate = totalRooms > 0 
        ? Math.round((activeBookings / totalRooms) * 100)
        : 0;

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0a7ea4" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <ThemedText style={styles.sectionTitle}>Thống Kê Tổng Quan</ThemedText>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => router.push('/host-stats' as any)}
        >
          <Ionicons name="stats-chart" size={16} color="#0a7ea4" />
          <ThemedText style={styles.viewDetailsText}>Chi tiết</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main Stats Grid - 2x2 Layout */}
      <View style={styles.mainStatsGrid}>
        {/* Total Homestays */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
            style={styles.mainStatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mainStatHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="business" size={32} color="#fff" />
              </View>
            </View>
            <View style={styles.mainStatContent}>
              <ThemedText style={styles.mainStatValue}>{stats.totalHomestays}</ThemedText>
              <ThemedText style={styles.mainStatLabel}>Homestay</ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Total Bookings */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#10a5c7', '#14b8d4', '#22d3ee']}
            style={styles.mainStatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mainStatHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={32} color="#fff" />
              </View>
            </View>
            <View style={styles.mainStatContent}>
              <ThemedText style={styles.mainStatValue}>{stats.totalBookings}</ThemedText>
              <ThemedText style={styles.mainStatLabel}>Tổng Đơn Đặt</ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Monthly Revenue */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#10b981', '#059669', '#047857']}
            style={styles.mainStatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mainStatHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="trending-up" size={32} color="#fff" />
              </View>
            </View>
            <View style={styles.mainStatContent}>
              <ThemedText style={styles.mainStatValue}>
                {formatRevenue(stats.monthlyRevenue)}
              </ThemedText>
              <ThemedText style={styles.mainStatLabel}>Doanh Thu Tháng</ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Active Bookings */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#f59e0b', '#f97316', '#ea580c']}
            style={styles.mainStatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mainStatHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="play-circle" size={32} color="#fff" />
              </View>
            </View>
            <View style={styles.mainStatContent}>
              <ThemedText style={styles.mainStatValue}>{stats.activeBookings}</ThemedText>
              <ThemedText style={styles.mainStatLabel}>Đang Diễn Ra</ThemedText>
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.3,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  mainStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  mainStatCard: {
    width: '47%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  mainStatGradient: {
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  mainStatHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mainStatContent: {
    marginTop: 8,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  mainStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.95,
    letterSpacing: 0.2,
  },
});

