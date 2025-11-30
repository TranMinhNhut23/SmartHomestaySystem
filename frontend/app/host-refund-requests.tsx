import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiService, getHomestayImageUrl } from '@/services/api';

interface RefundRequest {
  _id: string;
  homestay: {
    _id: string;
    name: string;
    address: string;
    images: string[];
  };
  room: {
    _id: string;
    name: string;
    type: string;
    pricePerNight: number;
  };
  guest: {
    _id: string;
    username: string;
    email: string;
    phone?: string;
  };
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  paymentStatus: string;
  status: string;
  refundRequest: {
    requested: boolean;
    requestedAt: string;
    requestReason: string;
    requestedBy: string;
    adminNote?: string;
  };
  refund: {
    status: string;
    amount: number;
    percentage: number;
    reason: string;
  };
  createdAt: string;
}

const STATUS_TABS = [
  { key: 'pending', label: 'Chờ duyệt', color: '#f59e0b' },
  { key: 'completed', label: 'Đã duyệt', color: '#22c55e' },
  { key: 'rejected', label: 'Đã từ chối', color: '#ef4444' },
];

export default function HostRefundRequestsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRefundRequests = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await apiService.getHostRefundRequests({
        status: selectedStatus,
        page: 1,
        limit: 50,
      });

      if (response.success) {
        setRefundRequests(response.data.bookings || []);
      }
    } catch (error: any) {
      console.error('Error fetching refund requests:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách yêu cầu hoàn tiền');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRefundRequests();
  }, [selectedStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateRefundPercentage = (request: RefundRequest): number => {
    const checkInDate = new Date(request.checkIn);
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Đồng bộ với backend: backend/src/models/Booking.js calculateRefundPercentage
    if (daysUntilCheckIn >= 7) {
      return 100;
    } else if (daysUntilCheckIn >= 3) {
      return 50;
    } else if (daysUntilCheckIn >= 1) {
      return 25;
    } else {
      return 0;
    }
  };

  const handleProcessRefund = (request: RefundRequest, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const refundPercentage = calculateRefundPercentage(request);
      const refundAmount = Math.round(request.totalPrice * (refundPercentage / 100));

      Alert.alert(
        'Xác nhận duyệt hoàn tiền',
        `⚠️ Số tiền ${formatCurrency(refundAmount)} sẽ được trừ từ ví của bạn và chuyển cho khách hàng.\n\n` +
        `📋 Thông tin:\n` +
        `• Khách hàng: ${request.guest.username}\n` +
        `• Homestay: ${request.homestay.name}\n` +
        `• Số tiền gốc: ${formatCurrency(request.totalPrice)}\n` +
        `• Hoàn tiền: ${refundPercentage}% = ${formatCurrency(refundAmount)}\n\n` +
        `💬 Lý do: ${request.refundRequest.requestReason}\n\n` +
        `Bạn có chắc chắn muốn tiếp tục?`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Đồng ý',
            onPress: () => processRefund(request._id, 'approve'),
          },
        ]
      );
    } else {
      Alert.prompt(
        'Từ chối yêu cầu hoàn tiền',
        'Vui lòng nhập lý do từ chối (tùy chọn):',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Xác nhận',
            onPress: (note) => processRefund(request._id, 'reject', note),
          },
        ],
        'plain-text',
        ''
      );
    }
  };

  const processRefund = async (bookingId: string, action: 'approve' | 'reject', adminNote?: string) => {
    try {
      setProcessingId(bookingId);

      const response = await apiService.processHostRefund(bookingId, action, adminNote);

      if (response.success) {
        Alert.alert(
          'Thành công',
          action === 'approve' 
            ? `Đã hoàn tiền thành công!\n\n• Tiền đã được trừ từ ví của bạn\n• Tiền đã được chuyển vào ví khách hàng\n• Booking đã được hủy` 
            : 'Đã từ chối yêu cầu hoàn tiền.',
          [
            {
              text: 'OK',
              onPress: () => {
                setExpandedId(null);
                fetchRefundRequests();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error processing refund:', error);
      Alert.alert('Lỗi', error.message || 'Không thể xử lý yêu cầu hoàn tiền');
    } finally {
      setProcessingId(null);
    }
  };

  const renderRefundRequest = (request: RefundRequest) => {
    const isExpanded = expandedId === request._id;
    const isProcessing = processingId === request._id;
    const refundPercentage = calculateRefundPercentage(request);
    const estimatedRefund = Math.round(request.totalPrice * (refundPercentage / 100));

    return (
      <TouchableOpacity
        key={request._id}
        style={[styles.requestCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
        onPress={() => setExpandedId(isExpanded ? null : request._id)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.requestHeader}>
          <Image
            source={{ uri: getHomestayImageUrl(request.homestay.images[0]) }}
            style={styles.homestayImage}
          />
          <View style={styles.requestHeaderInfo}>
            <ThemedText style={styles.homestayName} numberOfLines={1}>
              {request.homestay.name}
            </ThemedText>
            <ThemedText style={styles.guestName} numberOfLines={1}>
              👤 {request.guest.username}
            </ThemedText>
            <ThemedText style={styles.requestDate}>
              📅 {formatDate(request.refundRequest.requestedAt)}
            </ThemedText>
          </View>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={24} 
            color={isDark ? '#999' : '#666'} 
          />
        </View>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Guest Info */}
            <View style={styles.infoSection}>
              <ThemedText style={styles.sectionTitle}>📋 Thông tin khách hàng</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Tên:</ThemedText>
                <ThemedText style={styles.infoValue}>{request.guest.username}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Email:</ThemedText>
                <ThemedText style={styles.infoValue}>{request.guest.email}</ThemedText>
              </View>
              {request.guest.phone && (
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoLabel}>SĐT:</ThemedText>
                  <ThemedText style={styles.infoValue}>{request.guest.phone}</ThemedText>
                </View>
              )}
            </View>

            {/* Booking Info */}
            <View style={styles.infoSection}>
              <ThemedText style={styles.sectionTitle}>🏠 Thông tin đặt phòng</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Phòng:</ThemedText>
                <ThemedText style={styles.infoValue}>{request.room.name}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Check-in:</ThemedText>
                <ThemedText style={styles.infoValue}>{formatDate(request.checkIn)}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Check-out:</ThemedText>
                <ThemedText style={styles.infoValue}>{formatDate(request.checkOut)}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Tổng tiền:</ThemedText>
                <ThemedText style={[styles.infoValue, styles.priceText]}>
                  {formatCurrency(request.totalPrice)}
                </ThemedText>
              </View>
            </View>

            {/* Refund Info */}
            <View style={[styles.infoSection, styles.refundSection]}>
              <ThemedText style={styles.sectionTitle}>💰 Thông tin hoàn tiền</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Lý do:</ThemedText>
                <ThemedText style={[styles.infoValue, { flex: 1 }]}>
                  {request.refundRequest.requestReason}
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Tỉ lệ hoàn:</ThemedText>
                <ThemedText style={[styles.infoValue, styles.refundPercentage]}>
                  {refundPercentage}%
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Số tiền hoàn:</ThemedText>
                <ThemedText style={[styles.infoValue, styles.refundAmount]}>
                  {formatCurrency(estimatedRefund)}
                </ThemedText>
              </View>
            </View>

            {/* Actions - Only show for pending status */}
            {selectedStatus === 'pending' && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleProcessRefund(request, 'reject')}
                  disabled={isProcessing}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <ThemedText style={styles.actionButtonText}>Từ chối</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleProcessRefund(request, 'approve')}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <ThemedText style={styles.actionButtonText}>Chấp nhận</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Show result for completed/rejected */}
            {(selectedStatus === 'completed' || selectedStatus === 'rejected') && (
              <View style={[
                styles.resultBanner,
                { backgroundColor: selectedStatus === 'completed' ? '#22c55e20' : '#ef444420' }
              ]}>
                <Ionicons 
                  name={selectedStatus === 'completed' ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={selectedStatus === 'completed' ? '#22c55e' : '#ef4444'} 
                />
                <ThemedText style={[
                  styles.resultText,
                  { color: selectedStatus === 'completed' ? '#22c55e' : '#ef4444' }
                ]}>
                  {selectedStatus === 'completed' 
                    ? `Đã hoàn tiền ${formatCurrency(request.refund.amount)}` 
                    : 'Đã từ chối yêu cầu'}
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <LinearGradient
        colors={['#f59e0b', '#d97706', '#b45309']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Yêu cầu hoàn tiền</ThemedText>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      {/* Status Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedStatus === tab.key && {
                borderBottomColor: tab.color,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => setSelectedStatus(tab.key)}
          >
            <ThemedText
              style={[
                styles.tabText,
                selectedStatus === tab.key && { color: tab.color, fontWeight: '700' },
              ]}
            >
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
        </View>
      ) : refundRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
          <ThemedText style={styles.emptyText}>
            {selectedStatus === 'pending' 
              ? 'Không có yêu cầu nào đang chờ duyệt' 
              : selectedStatus === 'completed'
              ? 'Chưa có yêu cầu nào được duyệt'
              : 'Chưa có yêu cầu nào bị từ chối'}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRefundRequests(true)}
            />
          }
        >
          {refundRequests.map(renderRefundRequest)}
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
  tabsContainer: {
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homestayImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  requestHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  homestayName: {
    fontSize: 16,
    fontWeight: '700',
  },
  guestName: {
    fontSize: 14,
    opacity: 0.8,
  },
  requestDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 163, 175, 0.2)',
    gap: 16,
  },
  infoSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceText: {
    color: '#f59e0b',
  },
  refundSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  refundPercentage: {
    color: '#f59e0b',
    fontSize: 16,
  },
  refundAmount: {
    color: '#22c55e',
    fontSize: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#22c55e',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

