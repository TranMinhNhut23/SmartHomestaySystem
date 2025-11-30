import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService, getHomestayImageUrl } from '@/services/api';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Booking {
  _id: string;
  homestay: {
    _id: string;
    name: string;
    images: string[];
    address: {
      street: string;
      ward: { name: string };
      district: { name: string };
      province: { name: string };
    };
  };
  room: {
    _id: string;
    name: string;
    type: string;
    pricePerNight: number;
  };
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export default function RefundRequestScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handleSelectBooking = (bookingId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedBookingId(bookingId);
    setExpandedBookingId(bookingId);
  };

  useEffect(() => {
    loadRefundableBookings();
  }, []);

  const loadRefundableBookings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getRefundableBookings();
      
      if (response.success) {
        setBookings(response.data || []);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể tải danh sách đơn đặt phòng');
      }
    } catch (error: any) {
      console.error('Error loading refundable bookings:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách đơn đặt phòng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRefundRequest = async () => {
    if (!selectedBookingId) {
      Alert.alert('Thông báo', 'Vui lòng chọn đơn đặt phòng cần hoàn tiền');
      return;
    }

    if (!reason || reason.trim().length === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do yêu cầu hoàn tiền');
      return;
    }

    if (reason.trim().length < 10) {
      Alert.alert('Thông báo', 'Lý do phải có ít nhất 10 ký tự');
      return;
    }

    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn gửi yêu cầu hoàn tiền cho đơn đặt phòng này?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const response = await apiService.requestRefund(selectedBookingId, reason.trim());
              
              if (response.success) {
                Alert.alert(
                  'Thành công',
                  'Yêu cầu hoàn tiền đã được gửi. Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back()
                    }
                  ]
                );
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể gửi yêu cầu hoàn tiền');
              }
            } catch (error: any) {
              console.error('Error submitting refund request:', error);
              Alert.alert('Lỗi', error.message || 'Không thể gửi yêu cầu hoàn tiền');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getNumberOfNights = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
          <LinearGradient
            colors={['#0a7ea4', '#0d8bb8']}
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
              <ThemedText style={styles.headerTitle}>Hoàn Tiền</ThemedText>
              <View style={styles.placeholder} />
            </View>
          </LinearGradient>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0a7ea4" />
            <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <LinearGradient
          colors={['#0a7ea4', '#0d8bb8']}
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
            <ThemedText style={styles.headerTitle}>Hoàn Tiền</ThemedText>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#94a3b8" />
            <ThemedText style={styles.emptyTitle}>Không có đơn nào</ThemedText>
            <ThemedText style={styles.emptyText}>
              Bạn không có đơn đặt phòng nào có thể yêu cầu hoàn tiền.
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Chỉ các đơn đã thanh toán và đã được xác nhận mới có thể yêu cầu hoàn tiền.
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={22} color="#0a7ea4" />
              <ThemedText style={styles.infoText}>
                💡 Chọn một đơn đặt phòng để xem chi tiết và nhập lý do hoàn tiền
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Chọn đơn đặt phòng</ThemedText>
              
              {bookings.map((booking) => {
                const numberOfNights = getNumberOfNights(booking.checkIn, booking.checkOut);
                const isSelected = selectedBookingId === booking._id;
                const isExpanded = expandedBookingId === booking._id;
                
                return (
                  <View key={booking._id}>
                    <TouchableOpacity
                      style={[
                        styles.bookingCard,
                        isSelected && styles.bookingCardSelected
                      ]}
                      onPress={() => handleSelectBooking(booking._id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.selectIndicator}>
                        <View style={[
                          styles.radio,
                          isSelected && styles.radioSelected
                        ]}>
                          {isSelected && (
                            <View style={styles.radioDot} />
                          )}
                        </View>
                      </View>

                      <Image
                        source={{ uri: getHomestayImageUrl(booking.homestay.images[0]) }}
                        style={styles.bookingImage}
                      />

                      <View style={styles.bookingInfo}>
                        <ThemedText style={styles.homestayName} numberOfLines={1}>
                          {booking.homestay.name}
                        </ThemedText>
                        <View style={styles.bookingRow}>
                          <Ionicons name="bed-outline" size={14} color="#64748b" />
                          <ThemedText style={styles.bookingDetailText}>
                            {booking.room.name}
                          </ThemedText>
                        </View>
                        <View style={styles.bookingRow}>
                          <Ionicons name="calendar-outline" size={14} color="#64748b" />
                          <ThemedText style={styles.bookingDetailText}>
                            {formatDate(booking.checkIn)} • {numberOfNights} đêm
                          </ThemedText>
                        </View>
                        <View style={styles.bookingRow}>
                          <Ionicons name="cash-outline" size={14} color="#0a7ea4" />
                          <ThemedText style={styles.priceText}>
                            {formatPrice(booking.totalPrice)} VNĐ
                          </ThemedText>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <LinearGradient
                          colors={['#f0f9ff', '#e0f2fe']}
                          style={styles.expandedGradient}
                        >
                          <View style={styles.detailsContainer}>
                            <ThemedText style={styles.expandedTitle}>📋 Thông tin chi tiết</ThemedText>
                            
                            {/* Thông tin Homestay */}
                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>🏠 Homestay:</ThemedText>
                              <ThemedText style={styles.detailValue}>{booking.homestay.name}</ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>📍 Địa chỉ:</ThemedText>
                              <ThemedText style={styles.detailValue}>
                                {`${booking.homestay.address.street}, ${booking.homestay.address.ward.name}, ${booking.homestay.address.district.name}, ${booking.homestay.address.province.name}`}
                              </ThemedText>
                            </View>

                            {/* Thông tin Phòng */}
                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>🛏️ Phòng:</ThemedText>
                              <ThemedText style={styles.detailValue}>{booking.room.name}</ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>🏷️ Loại phòng:</ThemedText>
                              <ThemedText style={styles.detailValue}>{booking.room.type}</ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>💰 Giá mỗi đêm:</ThemedText>
                              <ThemedText style={styles.detailValue}>
                                {formatPrice(booking.room.pricePerNight)} VNĐ
                              </ThemedText>
                            </View>

                            {/* Thông tin Đặt phòng */}
                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>📅 Ngày nhận phòng:</ThemedText>
                              <ThemedText style={styles.detailValue}>{formatDate(booking.checkIn)}</ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>📅 Ngày trả phòng:</ThemedText>
                              <ThemedText style={styles.detailValue}>{formatDate(booking.checkOut)}</ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>🌙 Số đêm:</ThemedText>
                              <ThemedText style={styles.detailValue}>{numberOfNights} đêm</ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>👥 Số khách:</ThemedText>
                              <ThemedText style={styles.detailValue}>{booking.numberOfGuests} người</ThemedText>
                            </View>

                            {/* Trạng thái */}
                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>✅ Trạng thái:</ThemedText>
                              <ThemedText style={[styles.detailValue, styles.statusBadge]}>
                                {booking.status === 'confirmed' ? 'Đã xác nhận' : booking.status}
                              </ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>💳 Thanh toán:</ThemedText>
                              <ThemedText style={[styles.detailValue, styles.paidBadge]}>
                                {booking.paymentStatus === 'paid' ? 'Đã thanh toán' : booking.paymentStatus}
                              </ThemedText>
                            </View>

                            {/* Tổng tiền */}
                            <View style={styles.totalPriceSection}>
                              <ThemedText style={styles.totalPriceLabel}>💵 Tổng thanh toán:</ThemedText>
                              <ThemedText style={styles.totalPriceValue}>
                                {formatPrice(booking.totalPrice)} VNĐ
                              </ThemedText>
                            </View>

                            <View style={styles.detailSection}>
                              <ThemedText style={styles.detailLabel}>📆 Ngày đặt:</ThemedText>
                              <ThemedText style={styles.detailValue}>{formatDate(booking.createdAt)}</ThemedText>
                            </View>
                          </View>
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Lý do yêu cầu hoàn tiền *</ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  { 
                    color: colors.text,
                    backgroundColor: isDark ? '#1f2937' : '#fff',
                    borderColor: isDark ? '#374151' : '#e5e7eb'
                  }
                ]}
                placeholder="Nhập lý do yêu cầu hoàn tiền (tối thiểu 10 ký tự)..."
                placeholderTextColor={colors.icon}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <ThemedText style={styles.charCount}>
                {reason.length}/1000 ký tự
              </ThemedText>
            </View>

            <View style={styles.noticeCard}>
              <Ionicons name="alert-circle" size={20} color="#f59e0b" />
              <View style={styles.noticeContent}>
                <ThemedText style={styles.noticeTitle}>Lưu ý:</ThemedText>
                <ThemedText style={styles.noticeText}>
                  • Yêu cầu sẽ được xem xét trong 24-48 giờ
                </ThemedText>
                <ThemedText style={styles.noticeText}>
                  • Tiền sẽ được hoàn vào ví của bạn
                </ThemedText>
                <ThemedText style={styles.noticeText}>
                  • Vui lòng cung cấp lý do rõ ràng và chi tiết
                </ThemedText>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedBookingId || !reason.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitRefundRequest}
              disabled={!selectedBookingId || !reason.trim() || isSubmitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={!selectedBookingId || !reason.trim() || isSubmitting ? ['#94a3b8', '#94a3b8'] : ['#0a7ea4', '#0d8bb8']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <ThemedText style={styles.submitButtonText}>Gửi yêu cầu</ThemedText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#1e293b',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    color: '#0c4a6e',
    letterSpacing: 0.3,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingCardSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  selectIndicator: {
    justifyContent: 'center',
    marginRight: 12,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioSelected: {
    borderColor: '#0a7ea4',
    borderWidth: 3,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0a7ea4',
  },
  bookingImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 14,
  },
  bookingInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  homestayName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 22,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  textArea: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  expandedSection: {
    marginTop: -8,
    marginBottom: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  expandedGradient: {
    padding: 16,
  },
  detailsContainer: {
    gap: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  detailSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0c4a6e',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#0369a1',
    flex: 1.5,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '600',
  },
  paidBadge: {
    backgroundColor: '#0a7ea4',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '600',
  },
  totalPriceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#0a7ea4',
  },
  totalPriceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a7ea4',
  },
});

