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

interface AdminStatsSectionProps {
  user: User;
}

interface Stats {
  totalUsers: number;
  totalHosts: number;
  totalHomestays: number;
  pendingHomestays: number;
  totalBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export function AdminStatsSection({ user }: AdminStatsSectionProps) {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalHosts: 0,
    totalHomestays: 0,
    pendingHomestays: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch pending homestays
      const pendingRes = await apiService.getPendingHomestays({ limit: 1000 });
      const pendingHomestays = pendingRes.success 
        ? (Array.isArray(pendingRes.data) ? pendingRes.data.length : 0)
        : 0;

      // Fetch all homestays (we'll use getAllHomestays which should work for admin)
      const homestaysRes = await apiService.getAllHomestays({ limit: 1000 });
      const allHomestays = homestaysRes.success 
        ? (Array.isArray(homestaysRes.data) ? homestaysRes.data.length : 
           Array.isArray(homestaysRes.data?.homestays) ? homestaysRes.data.homestays.length : 0)
        : 0;

      // For now, we'll estimate users/hosts from homestays data
      // In a real app, you'd have admin endpoints for these stats
      const totalUsers = 0; // TODO: Add admin endpoint to get total users
      const totalHosts = 0; // TODO: Add admin endpoint to get total hosts

      // Fetch bookings using admin endpoint
      let bookings: any[] = [];
      let totalBookings = 0;
      let pendingBookings = 0;
      let totalRevenue = 0;
      let monthlyRevenue = 0;

      try {
        const bookingsRes = await apiService.getAllBookings({ limit: 1000 });
        if (bookingsRes.success) {
          bookings = bookingsRes.data?.bookings || bookingsRes.data || [];
        }
      } catch (error: any) {
        console.error('Error loading admin bookings:', error.message);
        bookings = [];
      }
      
      if (Array.isArray(bookings) && bookings.length > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        totalBookings = bookings.length;
        pendingBookings = bookings.filter((b: any) => b.status === 'pending').length;

        // Calculate revenue
        const confirmedCompletedBookings = bookings.filter(
          (b: any) => b.status === 'confirmed' || b.status === 'completed'
        );
        totalRevenue = confirmedCompletedBookings.reduce((sum: number, b: any) => {
          return sum + (b.totalPrice || 0);
        }, 0);

        // Monthly revenue
        const monthlyBookingsForRevenue = confirmedCompletedBookings.filter((b: any) => {
          const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
          return bookingDate && bookingDate >= startOfMonth;
        });
        monthlyRevenue = monthlyBookingsForRevenue.reduce((sum: number, b: any) => {
          return sum + (b.totalPrice || 0);
        }, 0);
      }

      setStats({
        totalUsers,
        totalHosts,
        totalHomestays: allHomestays,
        pendingHomestays,
        totalBookings,
        pendingBookings,
        totalRevenue,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
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
          <ActivityIndicator size="small" color="#8b5cf6" />
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
          onPress={() => router.push('/admin-statistics' as any)}
        >
          <Ionicons name="stats-chart" size={16} color="#8b5cf6" />
          <ThemedText style={styles.viewDetailsText}>Chi tiết</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main Stats Grid - 2x2 Layout */}
      <View style={styles.mainStatsGrid}>
        {/* Total Homestays */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
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
              <ThemedText style={styles.mainStatLabel}>Tổng Homestay</ThemedText>
            </View>
          </LinearGradient>
        </View>

        {/* Pending Homestays */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#f59e0b', '#f97316', '#ea580c']}
            style={styles.mainStatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.mainStatHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={32} color="#fff" />
              </View>
            </View>
            <View style={styles.mainStatContent}>
              <ThemedText style={styles.mainStatValue}>{stats.pendingHomestays}</ThemedText>
              <ThemedText style={styles.mainStatLabel}>Chờ Phê Duyệt</ThemedText>
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

        {/* Total Bookings */}
        <View style={styles.mainStatCard}>
          <LinearGradient
            colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
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
    backgroundColor: '#f3e8ff',
    borderRadius: 20,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
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

