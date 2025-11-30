import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFocusEffect } from '@react-navigation/native';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  role: string;
  createdAt: string;
}

interface NotificationGroup {
  title: string;
  notifications: Notification[];
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, isAuthenticated } = useAuth();
  const { refreshUnreadCount } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadNotifications();
      } else {
        setIsLoading(false);
      }
    }, [isAuthenticated])
  );

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const params: any = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      
      if (filter === 'unread') {
        params.isRead = false;
      }
      
      if (user?.roleName) {
        params.role = user.roleName;
      }

      const response = await apiService.getNotifications(params);
      if (response.success && response.data) {
        const notificationsData = Array.isArray(response.data)
          ? response.data
          : (response.data.notifications || response.data.data || []);
        setNotifications(notificationsData);
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      Alert.alert('Lỗi', 'Không thể tải thông báo');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleFilterChange = (newFilter: 'all' | 'unread') => {
    setFilter(newFilter);
    setRefreshing(true);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [filter, isAuthenticated]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await apiService.markNotificationAsRead(notificationId);
      if (response.success) {
        // Cập nhật local state
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        // Refresh unread count
        refreshUnreadCount();
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiService.markAllNotificationsAsRead();
      if (response.success) {
        // Cập nhật local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        // Refresh unread count
        refreshUnreadCount();
        Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc');
      }
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      Alert.alert('Lỗi', 'Không thể đánh dấu tất cả thông báo là đã đọc');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await apiService.deleteNotification(notificationId);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      Alert.alert('Lỗi', 'Không thể xóa thông báo');
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Đánh dấu là đã đọc khi nhấn
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate based on notification type
    if (notification.data) {
      if (notification.data.bookingId) {
        router.push(`/my-bookings`);
      } else if (notification.data.homestayId) {
        router.push(`/homestay-detail?id=${notification.data.homestayId}`);
      } else if (notification.type === 'wallet_deposit' || notification.type === 'wallet_withdraw') {
        router.push('/wallet-transactions');
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_created':
      case 'booking_confirmed':
      case 'new_booking_request':
        return 'calendar-outline';
      case 'booking_cancelled':
        return 'close-circle-outline';
      case 'booking_completed':
        return 'checkmark-circle-outline';
      case 'payment_success':
      case 'booking_payment_received':
        return 'card-outline';
      case 'payment_failed':
        return 'alert-circle-outline';
      case 'review_posted':
      case 'new_review':
        return 'star-outline';
      case 'homestay_approved':
        return 'checkmark-done-outline';
      case 'homestay_rejected':
      case 'host_request_rejected':
        return 'close-outline';
      case 'homestay_pending_review':
      case 'homestay_submitted':
        return 'time-outline';
      case 'host_request_approved':
        return 'checkmark-outline';
      case 'wallet_deposit':
      case 'wallet_withdraw':
      case 'wallet_transaction':
        return 'wallet-outline';
      case 'system_announcement':
        return 'megaphone-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    if (type.includes('success') || type.includes('approved') || type.includes('confirmed') || type === 'booking_completed') {
      return '#10b981';
    }
    if (type.includes('failed') || type.includes('rejected') || type === 'booking_cancelled') {
      return '#ef4444';
    }
    if (type.includes('pending') || type.includes('request')) {
      return '#f59e0b';
    }
    if (type.includes('wallet')) {
      return '#0a7ea4';
    }
    return '#64748b';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <LinearGradient
          colors={['#0a7ea4', '#0d8bb8']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ThemedText style={styles.headerTitle}>Thông Báo</ThemedText>
        </LinearGradient>
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={64} color="#94a3b8" />
          <ThemedText style={styles.emptyStateText}>
            Vui lòng đăng nhập để xem thông báo
          </ThemedText>
        </View>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <LinearGradient
          colors={['#0a7ea4', '#0d8bb8']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ThemedText style={styles.headerTitle}>Thông Báo</ThemedText>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
          <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Thông Báo</ThemedText>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <ThemedText style={styles.headerBadgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.markAllButtonText}>Đánh dấu tất cả đã đọc</ThemedText>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => handleFilterChange('all')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            Tất cả
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => handleFilterChange('unread')}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            Chưa đọc
          </ThemedText>
          {unreadCount > 0 && filter === 'unread' && (
            <View style={styles.filterBadge}>
              <ThemedText style={styles.filterBadgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#94a3b8" />
            <ThemedText style={styles.emptyStateText}>
              {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification._id}
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.notificationCardUnread,
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationContent}>
                  <View
                    style={[
                      styles.notificationIconContainer,
                      { backgroundColor: `${getNotificationColor(notification.type)}20` },
                    ]}
                  >
                    <Ionicons
                      name={getNotificationIcon(notification.type) as any}
                      size={24}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={styles.notificationTextContainer}>
                    <View style={styles.notificationHeader}>
                      <ThemedText
                        style={[
                          styles.notificationTitle,
                          !notification.isRead && styles.notificationTitleUnread,
                        ]}
                        numberOfLines={2}
                      >
                        {notification.title}
                      </ThemedText>
                      {!notification.isRead && <View style={styles.unreadDot} />}
                    </View>
                    <ThemedText style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </ThemedText>
                    <ThemedText style={styles.notificationDate}>
                      {formatDate(notification.createdAt)}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteNotification(notification._id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  markAllButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  markAllButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  filterTabActive: {
    backgroundColor: '#f0f9ff',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#0a7ea4',
  },
  filterBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 0,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
    backgroundColor: '#f8fafc',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notificationTextContainer: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  notificationTitleUnread: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a7ea4',
    marginTop: 4,
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  notificationDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});

