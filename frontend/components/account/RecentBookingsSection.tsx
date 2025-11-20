import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';

interface User {
  _id: string;
}

interface RecentBookingsSectionProps {
  user: User;
}

interface Booking {
  _id: string;
  homestay: {
    name: string;
  };
  room: {
    name: string;
  };
  guest: {
    username: string;
  };
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  createdAt: string;
}

export function RecentBookingsSection({ user }: RecentBookingsSectionProps) {
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentBookings();
  }, [user]);

  const loadRecentBookings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHostBookings({ limit: 5 });
      const bookings = response.success
        ? (response.data?.bookings || response.data || [])
        : [];
      setRecentBookings(Array.isArray(bookings) ? bookings.slice(0, 5) : []);
    } catch (error) {
      console.error('Error loading recent bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#10b981';
      case 'completed':
        return '#6366f1';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ Duyệt';
      case 'confirmed':
        return 'Đã Xác Nhận';
      case 'completed':
        return 'Hoàn Thành';
      case 'cancelled':
        return 'Đã Hủy';
      default:
        return status;
    }
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

  if (recentBookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.sectionTitle}>Đơn Đặt Gần Đây</ThemedText>
          <TouchableOpacity onPress={() => router.push('/host-bookings' as any)}>
            <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
          <ThemedText style={styles.emptyText}>Chưa có đơn đặt nào</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>Đơn Đặt Gần Đây</ThemedText>
        <TouchableOpacity onPress={() => router.push('/host-bookings' as any)}>
          <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.bookingsList}>
        {recentBookings.map((booking) => (
          <TouchableOpacity
            key={booking._id}
            style={styles.bookingCard}
            onPress={() => router.push('/host-bookings' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.bookingHeader}>
              <View style={styles.bookingInfo}>
                <ThemedText style={styles.homestayName} numberOfLines={1}>
                  {booking.homestay?.name || 'N/A'}
                </ThemedText>
                <ThemedText style={styles.roomName} numberOfLines={1}>
                  {booking.room?.name || 'N/A'}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) + '20' },
                ]}
              >
                <ThemedText
                  style={[styles.statusText, { color: getStatusColor(booking.status) }]}
                >
                  {getStatusLabel(booking.status)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="#6b7280" />
                <ThemedText style={styles.detailText}>
                  {booking.guest?.username || 'N/A'}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <ThemedText style={styles.detailText}>
                  {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="#6b7280" />
                <ThemedText style={styles.priceText}>
                  {formatPrice(booking.totalPrice || 0)} VNĐ
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  bookingsList: {
    gap: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  bookingInfo: {
    flex: 1,
    marginRight: 12,
  },
  homestayName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  roomName: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bookingDetails: {
    gap: 10,
    paddingTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.2,
  },
});

