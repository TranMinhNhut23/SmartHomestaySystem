import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { apiService } from '@/services/api';
import { ROOM_TYPES } from '@/types/homestay';
import { Linking, Clipboard } from 'react-native';

interface BookingData {
  homestayId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  guestInfo: {
    fullName: string;
    phone: string;
    email: string;
    specialRequests?: string;
  };
  totalPrice: number;
  originalPrice?: number;
  discountAmount?: number;
  couponCode?: string | null;
  homestay: {
    _id: string;
    name: string;
    address: {
      province: { name: string };
      district: { name: string };
      ward: { name: string };
      street: string;
    };
  };
  room: {
    _id: string;
    name: string;
    type: string;
    pricePerNight: number;
    maxGuests: number;
  };
}

interface BookingFromAPI {
  _id: string;
  homestay: {
    _id: string;
    name: string;
    address: {
      province: { name: string };
      district: { name: string };
      ward: { name: string };
      street: string;
    };
  };
  room: {
    _id: string;
    name: string;
    type: string;
    pricePerNight: number;
    maxGuests: number;
  };
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  originalPrice?: number;
  discountAmount?: number;
  couponCode?: string | null;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  guestInfo: {
    fullName: string;
    phone: string;
    email: string;
    specialRequests?: string;
  };
}

export default function BookingConfirmScreen() {
  const { bookingData: bookingDataParam, bookingId } = useLocalSearchParams<{ 
    bookingData?: string;
    bookingId?: string;
  }>();
  const { user, isAuthenticated } = useAuth();
  const { createBooking, getBookingById } = useBooking();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [bookingFromAPI, setBookingFromAPI] = useState<BookingFromAPI | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'momo' | 'vnpay' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đặt phòng', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    // Nếu có bookingId, load booking từ API
    if (bookingId) {
      setCurrentBookingId(bookingId);
      loadBookingFromAPI(bookingId);
    } 
    // Nếu có bookingData, parse từ params (flow tạo mới)
    else if (bookingDataParam) {
      try {
        const data = JSON.parse(bookingDataParam);
        setBookingData(data);
      } catch (error) {
        console.error('Error parsing booking data:', error);
        Alert.alert('Lỗi', 'Dữ liệu đặt phòng không hợp lệ', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    }
  }, [bookingId, bookingDataParam, isAuthenticated]);

  const loadBookingFromAPI = useCallback(async (id: string) => {
    try {
      setIsLoadingBooking(true);
      const response = await getBookingById(id);
      
      if (response.success && response.data) {
        const booking = response.data;
        setBookingFromAPI(booking);
        
        // Set payment method nếu đã có
        if (booking.paymentMethod) {
          setSelectedPaymentMethod(booking.paymentMethod as 'momo' | 'vnpay');
        }
      } else {
        throw new Error(response.message || 'Không thể tải thông tin đặt phòng');
      }
    } catch (error: any) {
      console.error('Error loading booking:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin đặt phòng', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setIsLoadingBooking(false);
    }
  }, [getBookingById]);

  // Reload booking data khi màn hình được focus lại (sau khi quay lại từ payment gateway)
  useFocusEffect(
    useCallback(() => {
      if (currentBookingId && isAuthenticated) {
        console.log('Screen focused, reloading booking:', currentBookingId);
        loadBookingFromAPI(currentBookingId);
      }
    }, [currentBookingId, isAuthenticated, loadBookingFromAPI])
  );

  // Reload booking khi app trở lại foreground (sau khi thanh toán)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && currentBookingId && isAuthenticated) {
        console.log('App became active, reloading booking:', currentBookingId);
        loadBookingFromAPI(currentBookingId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentBookingId, isAuthenticated, loadBookingFromAPI]);


  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateFull = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = days[date.getDay()];
    return `${dayName}, ${date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getRoomTypeLabel = (type: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.type === type);
    return roomType?.label || type;
  };

  const calculateNumberOfNights = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return 0;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Lỗi', 'Vui lòng chọn phương thức thanh toán');
      return;
    }

    if (!bookingData) {
      Alert.alert('Lỗi', 'Dữ liệu đặt phòng không hợp lệ');
      return;
    }

    try {
      setIsSubmitting(true);

      // Tạo booking trước (với paymentMethod = null, paymentStatus = pending)
      const bookingPayload = {
        homestayId: displayBooking.homestayId,
        roomId: displayBooking.roomId,
        checkIn: displayBooking.checkIn,
        checkOut: displayBooking.checkOut,
        numberOfGuests: displayBooking.numberOfGuests,
        guestInfo: displayBooking.guestInfo,
        paymentMethod: selectedPaymentMethod,
        couponCode: displayBooking.couponCode || null,
      };

      console.log('Creating booking with payment method:', bookingPayload);

      const bookingResponse = await createBooking(bookingPayload);

      if (!bookingResponse.success || !bookingResponse.data) {
        throw new Error(bookingResponse.message || 'Tạo booking thất bại');
      }

      const newBookingId = bookingResponse.data._id;
      const orderInfo = `Thanh toán đặt phòng #${newBookingId.slice(-8)}`;

      // Lưu bookingId để có thể reload sau khi quay lại từ payment gateway
      setCurrentBookingId(newBookingId);
      
      // Load booking từ API để có đầy đủ thông tin
      await loadBookingFromAPI(newBookingId);

      // Tạo payment URL từ MoMo
      console.log('Creating payment URL for booking:', newBookingId);
      const paymentResponse = await apiService.createPayment(
        newBookingId,
        displayBooking.totalPrice,
        orderInfo
      );

      if (paymentResponse.success && paymentResponse.data?.paymentUrl) {
        // Mở payment URL trong browser
        const canOpen = await Linking.canOpenURL(paymentResponse.data.paymentUrl);
        
        if (canOpen) {
          await Linking.openURL(paymentResponse.data.paymentUrl);
          // User sẽ được redirect đến MoMo để thanh toán
          // Sau khi thanh toán xong, MoMo sẽ redirect về redirectUrl
          // Backend sẽ xử lý IPN và return URL
          // Khi user quay lại app, useFocusEffect và AppState sẽ tự động reload booking
        } else {
          throw new Error('Không thể mở link thanh toán');
        }
      } else {
        throw new Error(paymentResponse.message || 'Tạo payment URL thất bại');
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      Alert.alert('Lỗi', error.message || 'Xử lý thanh toán thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sử dụng bookingFromAPI nếu có, nếu không dùng bookingData
  const currentBooking = bookingFromAPI || bookingData;
  const isPaid = bookingFromAPI?.paymentStatus === 'paid';
  const isCancelled = bookingFromAPI?.status === 'cancelled';
  const isNewBooking = !bookingId && bookingData;
  const canMakePayment = !isPaid && !isCancelled && isNewBooking;

  if (isLoadingBooking || !currentBooking) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
      </View>
    );
  }

  // Convert bookingFromAPI sang format BookingData nếu cần
  const displayBooking: BookingData = bookingFromAPI ? {
    homestayId: bookingFromAPI.homestay._id,
    roomId: bookingFromAPI.room._id,
    checkIn: bookingFromAPI.checkIn,
    checkOut: bookingFromAPI.checkOut,
    numberOfGuests: bookingFromAPI.numberOfGuests,
    guestInfo: bookingFromAPI.guestInfo,
    totalPrice: bookingFromAPI.totalPrice,
    originalPrice: bookingFromAPI.originalPrice,
    discountAmount: bookingFromAPI.discountAmount,
    couponCode: bookingFromAPI.couponCode,
    homestay: bookingFromAPI.homestay,
    room: bookingFromAPI.room,
  } : bookingData!;

  const numberOfNights = calculateNumberOfNights(displayBooking.checkIn, displayBooking.checkOut);

  // Hàm lấy màu và label cho status
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case 'pending':
        return { color: '#f59e0b', label: 'Chờ xác nhận', bgColor: '#fef3c7' };
      case 'confirmed':
        return { color: '#10b981', label: 'Đã xác nhận', bgColor: '#d1fae5' };
      case 'cancelled':
        return { color: '#ef4444', label: 'Đã hủy', bgColor: '#fee2e2' };
      case 'completed':
        return { color: '#6366f1', label: 'Hoàn thành', bgColor: '#e0e7ff' };
      default:
        return { color: '#64748b', label: status || 'Chưa xác định', bgColor: '#f1f5f9' };
    }
  };

  const statusInfo = getStatusInfo(bookingFromAPI?.status);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Xác Nhận Đặt Phòng</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                <LinearGradient
                  colors={['#f8fafc', '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepIndicatorGradient}
                >
                  <View style={styles.stepIndicatorContent}>
                    <View style={styles.stepContainer}>
                      <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
                        <LinearGradient
                          colors={['#10b981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.stepCircleGradient}
                        >
                          <Ionicons name="checkmark" size={22} color="#fff" />
                        </LinearGradient>
                      </View>
                      <View style={styles.stepLabelContainer}>
                        <ThemedText style={[styles.stepLabel, styles.stepLabelCompleted]} numberOfLines={1}>Chọn phòng & Ngày</ThemedText>
                        <ThemedText style={styles.stepSubLabel}>Bước 1</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.stepLine, styles.stepLineCompleted]} />
                    <View style={styles.stepContainer}>
                      <View style={[
                        styles.stepCircle, 
                        isPaid ? styles.stepCircleCompleted : styles.stepCircleActive
                      ]}>
                        {isPaid ? (
                          <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.stepCircleGradient}
                          >
                            <Ionicons name="checkmark" size={22} color="#fff" />
                          </LinearGradient>
                        ) : (
                          <LinearGradient
                            colors={['#0a7ea4', '#0d8bb8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.stepCircleGradient}
                          >
                            <ThemedText style={styles.stepNumber}>2</ThemedText>
                          </LinearGradient>
                        )}
                      </View>
                      <View style={styles.stepLabelContainer}>
                        <ThemedText style={[
                          styles.stepLabel, 
                          isPaid ? styles.stepLabelCompleted : styles.stepLabelActive
                        ]} numberOfLines={1}>Xác nhận</ThemedText>
                        <ThemedText style={styles.stepSubLabel}>Bước 2</ThemedText>
                      </View>
                    </View>
                    <View style={[styles.stepLine, isPaid ? styles.stepLineCompleted : styles.stepLineInactive]} />
                    <View style={styles.stepContainer}>
                      <View style={[
                        styles.stepCircle, 
                        isPaid ? styles.stepCircleCompleted : styles.stepCircleInactive
                      ]}>
                        {isPaid ? (
                          <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.stepCircleGradient}
                          >
                            <Ionicons name="checkmark" size={22} color="#fff" />
                          </LinearGradient>
                        ) : (
                          <ThemedText style={styles.stepNumberInactive}>3</ThemedText>
                        )}
                      </View>
                      <View style={styles.stepLabelContainer}>
                        <ThemedText style={[
                          styles.stepLabel, 
                          isPaid ? styles.stepLabelCompleted : styles.stepLabelInactive
                        ]} numberOfLines={1}>Thanh toán</ThemedText>
                        <ThemedText style={styles.stepSubLabel}>Bước 3</ThemedText>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

        {/* Success Message when paid */}
        {isPaid && (
          <View style={styles.successMessageContainer}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.successMessageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={64} color="#fff" />
              </View>
              <ThemedText style={styles.successTitle}>Thanh toán thành công!</ThemedText>
              <ThemedText style={styles.successSubtitle}>
                Đơn đặt phòng của bạn đã được xác nhận. Bạn sẽ được chuyển về trang đơn đặt phòng trong giây lát...
              </ThemedText>
              <View style={styles.successInfo}>
                <Ionicons name="receipt-outline" size={20} color="#fff" />
                <ThemedText style={styles.successInfoText}>
                  Mã đơn: #{bookingFromAPI?._id.slice(-8) || ''}
                </ThemedText>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Booking Status */}
        {bookingFromAPI && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle" size={22} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.sectionTitle}>Tình Trạng Đơn</ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor, borderLeftWidth: 4, borderLeftColor: statusInfo.color }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </ThemedText>
            </View>
            {isPaid && (
              <View style={styles.paymentStatusInfo}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                </View>
                <ThemedText style={styles.paymentStatusText}>Đã thanh toán thành công</ThemedText>
              </View>
            )}
            {isCancelled && (
              <View style={styles.paymentStatusInfo}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </View>
                <ThemedText style={styles.paymentStatusText}>Đơn đã bị hủy</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Homestay Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="business" size={22} color="#0a7ea4" />
            </View>
            <ThemedText style={styles.sectionTitle}>Thông Tin Homestay</ThemedText>
          </View>
          <View style={styles.homestayCard}>
            <View style={styles.homestayIconWrapper}>
              <Ionicons name="home" size={28} color="#0a7ea4" />
            </View>
            <View style={styles.homestayContent}>
              <ThemedText style={styles.homestayName}>{displayBooking.homestay.name}</ThemedText>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={16} color="#64748b" />
                <ThemedText style={styles.homestayAddress}>
                  {displayBooking.homestay.address.street}, {displayBooking.homestay.address.ward.name}, {displayBooking.homestay.address.district.name}, {displayBooking.homestay.address.province.name}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Room Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="bed" size={22} color="#0a7ea4" />
            </View>
            <ThemedText style={styles.sectionTitle}>Thông Tin Phòng</ThemedText>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="cube-outline" size={16} color="#64748b" />
                <ThemedText style={styles.infoLabel}>Tên phòng</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>{displayBooking.room.name}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="layers-outline" size={16} color="#64748b" />
                <ThemedText style={styles.infoLabel}>Loại phòng</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>{getRoomTypeLabel(displayBooking.room.type)}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="cash-outline" size={16} color="#64748b" />
                <ThemedText style={styles.infoLabel}>Giá/đêm</ThemedText>
              </View>
              <ThemedText style={[styles.infoValue, styles.priceHighlight]}>
                {formatPrice(displayBooking.room.pricePerNight)} VNĐ
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoItemHeader}>
                <Ionicons name="people-outline" size={16} color="#64748b" />
                <ThemedText style={styles.infoLabel}>Số khách</ThemedText>
              </View>
              <ThemedText style={styles.infoValue}>{displayBooking.numberOfGuests} khách</ThemedText>
            </View>
          </View>
        </View>

        {/* Date Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={22} color="#0a7ea4" />
            </View>
            <ThemedText style={styles.sectionTitle}>Thông Tin Ngày</ThemedText>
          </View>
          <View style={styles.dateContainer}>
            <View style={styles.dateCard}>
              <View style={styles.dateIconWrapper}>
                <Ionicons name="log-in" size={20} color="#10b981" />
              </View>
              <View style={styles.dateContent}>
                <ThemedText style={styles.dateLabel}>Nhận phòng</ThemedText>
                <ThemedText style={styles.dateValue}>{formatDateFull(displayBooking.checkIn)}</ThemedText>
              </View>
            </View>
            <View style={styles.dateDivider}>
              <View style={styles.dateDividerLine} />
              <View style={styles.nightsBadge}>
                <ThemedText style={styles.nightsBadgeText}>{numberOfNights}</ThemedText>
                <ThemedText style={styles.nightsBadgeLabel}>đêm</ThemedText>
              </View>
              <View style={styles.dateDividerLine} />
            </View>
            <View style={styles.dateCard}>
              <View style={[styles.dateIconWrapper, styles.dateIconWrapperOut]}>
                <Ionicons name="log-out" size={20} color="#f97316" />
              </View>
              <View style={styles.dateContent}>
                <ThemedText style={styles.dateLabel}>Trả phòng</ThemedText>
                <ThemedText style={styles.dateValue}>{formatDateFull(displayBooking.checkOut)}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Guest Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={22} color="#0a7ea4" />
            </View>
            <ThemedText style={styles.sectionTitle}>Thông Tin Khách Hàng</ThemedText>
          </View>
          <View style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person-circle" size={48} color="#0a7ea4" />
            </View>
            <View style={styles.guestInfo}>
              <View style={styles.guestInfoRow}>
                <Ionicons name="person-outline" size={16} color="#64748b" />
                <ThemedText style={styles.guestInfoValue} numberOfLines={1}>{displayBooking.guestInfo.fullName}</ThemedText>
                <View style={styles.guestInfoDivider} />
                <Ionicons name="call-outline" size={16} color="#64748b" />
                <ThemedText style={styles.guestInfoValue} numberOfLines={1}>{displayBooking.guestInfo.phone}</ThemedText>
                <View style={styles.guestInfoDivider} />
                <Ionicons name="mail-outline" size={16} color="#64748b" />
                <ThemedText style={styles.guestInfoValue} numberOfLines={1} ellipsizeMode="tail">{displayBooking.guestInfo.email}</ThemedText>
              </View>
            </View>
          </View>
          {displayBooking.guestInfo.specialRequests && (
            <View style={styles.specialRequestsCard}>
              <View style={styles.specialRequestsHeader}>
                <Ionicons name="star" size={18} color="#f59e0b" />
                <ThemedText style={styles.specialRequestsLabel}>Yêu cầu đặc biệt</ThemedText>
              </View>
              <ThemedText style={styles.specialRequestsValue}>{displayBooking.guestInfo.specialRequests}</ThemedText>
            </View>
          )}
        </View>

        {/* Coupon Info */}
        {displayBooking.couponCode && displayBooking.discountAmount && displayBooking.discountAmount > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="ticket" size={22} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.sectionTitle}>Mã Giảm Giá Đã Áp Dụng</ThemedText>
            </View>
            <LinearGradient
              colors={['#f0fdf4', '#dcfce7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.couponInfoCard}
            >
              <View style={styles.couponInfoContent}>
                <View style={styles.couponInfoIconWrapper}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.couponInfoTextContainer}>
                  <ThemedText style={styles.couponInfoCode}>{displayBooking.couponCode}</ThemedText>
                </View>
                <View style={styles.couponInfoDivider} />
                <View style={styles.couponInfoRight}>
                  <ThemedText style={styles.couponInfoDiscount}>
                    -{formatPrice(displayBooking.discountAmount)} VNĐ
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="card" size={22} color="#0a7ea4" />
            </View>
            <ThemedText style={styles.sectionTitle}>Phương Thức Thanh Toán</ThemedText>
          </View>
          
          {isPaid ? (
            // Hiển thị phương thức thanh toán đã dùng
            <View style={[styles.paymentMethodCard, styles.paymentMethodCardPaid]}>
              <LinearGradient
                colors={['#f0fdf4', '#dcfce7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.paymentMethodPaidGradient}
              >
                <View style={styles.paymentMethodContent}>
                  <View style={[styles.paymentMethodIcon, styles.paymentMethodIconPaid]}>
                    {bookingFromAPI?.paymentMethod === 'momo' ? (
                      <Ionicons name="phone-portrait" size={40} color="#A50064" />
                    ) : (
                      <ThemedText style={[styles.vnpayText, { fontSize: 18, fontWeight: '900' }]}>VNPAY</ThemedText>
                    )}
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <ThemedText style={styles.paymentMethodName}>
                      {bookingFromAPI?.paymentMethod === 'momo' ? 'Ví MoMo' : 'VNPay'}
                    </ThemedText>
                    <View style={styles.successBadgeContainer}>
                      <View style={styles.successBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#fff" />
                        <ThemedText style={styles.successBadgeText}>Đã thanh toán</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.paymentMethodDescription}>
                      Thanh toán đã được xác nhận thành công
                    </ThemedText>
                  </View>
                  <View style={styles.successCheckContainer}>
                    <View style={styles.successCheckCircle}>
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    </View>
                  </View>
                </View>
              </LinearGradient>
              {bookingFromAPI?.paymentTransactionId && (
                <View style={styles.transactionIdSection}>
                  <View style={styles.transactionIdHeader}>
                    <Ionicons name="receipt" size={18} color="#64748b" />
                    <ThemedText style={styles.transactionIdLabel}>Mã giao dịch</ThemedText>
                  </View>
                  <View style={styles.transactionIdValueContainer}>
                    <ThemedText style={styles.transactionIdValue}>
                      {bookingFromAPI.paymentTransactionId}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={async () => {
                        if (bookingFromAPI?.paymentTransactionId) {
                          await Clipboard.setString(bookingFromAPI.paymentTransactionId);
                          Alert.alert('Đã sao chép', 'Mã giao dịch đã được sao chép vào clipboard');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="copy-outline" size={16} color="#0a7ea4" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Hiển thị lựa chọn phương thức thanh toán (chỉ khi chưa thanh toán)
            <>
              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod === 'momo' && styles.paymentMethodCardSelected,
                  (isPaid || isCancelled) && styles.paymentMethodCardDisabled,
                ]}
                onPress={() => setSelectedPaymentMethod('momo')}
                activeOpacity={0.7}
                disabled={isPaid || isCancelled}
              >
                <LinearGradient
                  colors={selectedPaymentMethod === 'momo' ? ['#FFF0F6', '#FFE4EC'] : ['#fff', '#fff']}
                  style={styles.paymentMethodGradient}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={[styles.paymentMethodIcon, selectedPaymentMethod === 'momo' && styles.paymentMethodIconSelected]}>
                      <Ionicons name="phone-portrait" size={36} color="#A50064" />
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <ThemedText style={styles.paymentMethodName}>Ví MoMo</ThemedText>
                      <ThemedText style={styles.paymentMethodDescription}>
                        Thanh toán nhanh và an toàn
                      </ThemedText>
                    </View>
                    {selectedPaymentMethod === 'momo' && (
                      <View style={styles.checkContainer}>
                        <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod === 'vnpay' && styles.paymentMethodCardSelected,
                  (isPaid || isCancelled) && styles.paymentMethodCardDisabled,
                ]}
                onPress={() => setSelectedPaymentMethod('vnpay')}
                activeOpacity={0.7}
                disabled={isPaid || isCancelled}
              >
                <LinearGradient
                  colors={selectedPaymentMethod === 'vnpay' ? ['#E6F2FF', '#CCE5FF'] : ['#fff', '#fff']}
                  style={styles.paymentMethodGradient}
                >
                  <View style={styles.paymentMethodContent}>
                    <View style={[styles.paymentMethodIcon, styles.paymentMethodIconVnpay, selectedPaymentMethod === 'vnpay' && styles.paymentMethodIconSelected]}>
                      <ThemedText style={styles.vnpayText}>VNPAY</ThemedText>
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <ThemedText style={styles.paymentMethodName}>VNPay</ThemedText>
                      <ThemedText style={styles.paymentMethodDescription}>
                        Thanh toán qua cổng VNPay
                      </ThemedText>
                    </View>
                    {selectedPaymentMethod === 'vnpay' && (
                      <View style={styles.checkContainer}>
                        <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Price Summary */}
        <LinearGradient
          colors={['#fff', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.priceSummary}
        >
          <View style={styles.priceSummaryHeader}>
            <Ionicons name="receipt" size={24} color="#0a7ea4" />
            <ThemedText style={styles.priceSummaryTitle}>Tóm Tắt Thanh Toán</ThemedText>
          </View>
          <View style={styles.priceDetails}>
            <View style={styles.priceRow}>
              <View style={styles.priceRowLeft}>
                <Ionicons name="bed-outline" size={16} color="#64748b" />
                <ThemedText style={styles.priceLabel}>
                  {formatPrice(displayBooking.room.pricePerNight)} VNĐ × {numberOfNights} đêm
                </ThemedText>
              </View>
              <ThemedText style={styles.priceValue}>
                {formatPrice(displayBooking.room.pricePerNight * numberOfNights)} VNĐ
              </ThemedText>
            </View>
            
            {/* Coupon Discount */}
            {(displayBooking.discountAmount && displayBooking.discountAmount > 0 && displayBooking.couponCode) && (
              <View style={styles.priceRow}>
                <View style={styles.priceRowLeft}>
                  <Ionicons name="ticket" size={16} color="#10b981" />
                  <View style={styles.couponDiscountInfo}>
                    <ThemedText style={styles.priceLabel}>
                      Mã giảm giá ({displayBooking.couponCode})
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.discountValue}>
                  -{formatPrice(displayBooking.discountAmount)} VNĐ
                </ThemedText>
              </View>
            )}
            
            <View style={[styles.priceRow, styles.totalRow]}>
              <View style={styles.totalRowLeft}>
                <Ionicons name="wallet" size={20} color="#f97316" />
                <ThemedText style={styles.totalLabel}>Tổng cộng</ThemedText>
              </View>
              <ThemedText style={styles.totalValue}>
                {formatPrice(displayBooking.totalPrice)} VNĐ
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceInfo}>
          <ThemedText style={styles.bottomPriceLabel}>Tổng giá</ThemedText>
          <ThemedText style={styles.bottomPriceAmount}>
            {formatPrice(displayBooking.totalPrice)} VNĐ
          </ThemedText>
        </View>
        {canMakePayment && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedPaymentMethod || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handlePayment}
            disabled={!selectedPaymentMethod || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Thanh Toán</ThemedText>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.3,
    flex: 1,
  },
  homestayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  homestayIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homestayContent: {
    flex: 1,
    gap: 8,
  },
  homestayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  homestayAddress: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    width: '48%',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#11181C',
    fontWeight: '700',
  },
  priceHighlight: {
    color: '#f97316',
  },
  dateContainer: {
    gap: 12,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateIconWrapperOut: {
    backgroundColor: '#fed7aa',
  },
  dateContent: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    color: '#11181C',
    fontWeight: '700',
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  nightsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0a7ea4',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  nightsBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  nightsBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    marginTop: -2,
  },
  guestCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    alignItems: 'center',
  },
  guestAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestInfo: {
    flex: 1,
  },
  guestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  guestInfoValue: {
    fontSize: 13,
    color: '#11181C',
    fontWeight: '600',
    maxWidth: 120,
  },
  guestInfoDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
  },
  specialRequestsCard: {
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 8,
  },
  specialRequestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specialRequestsLabel: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '700',
  },
  specialRequestsValue: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 4,
  },
  paymentMethodCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  paymentMethodGradient: {
    padding: 18,
    borderRadius: 14,
  },
  paymentMethodCardSelected: {
    borderColor: '#0a7ea4',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentMethodCardPaid: {
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    padding: 0,
    overflow: 'hidden',
  },
  paymentMethodPaidGradient: {
    padding: 20,
  },
  paymentMethodCardDisabled: {
    opacity: 0.5,
    borderColor: '#e5e7eb',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  successBadgeContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#10b981',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  successBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  successCheckContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCheckCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  transactionIdSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
    gap: 10,
  },
  transactionIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  transactionIdLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  transactionIdValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  transactionIdValue: {
    fontSize: 14,
    color: '#11181C',
    fontFamily: 'monospace',
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  checkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  successIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentStatusText: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '600',
    flex: 1,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  paymentMethodIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#FFF0F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodIconPaid: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
    borderWidth: 3,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodIconVnpay: {
    backgroundColor: '#E6F2FF',
  },
  paymentMethodIconSelected: {
    borderColor: '#0a7ea4',
    transform: [{ scale: 1.05 }],
  },
  paymentMethodInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentMethodName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  vnpayText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A5CB8',
  },
  priceSummary: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  priceSummaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
  },
  priceDetails: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
  },
  couponDiscountInfo: {
    flex: 1,
  },
  discountValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10b981',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginTop: 8,
    paddingBottom: 4,
  },
  totalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f97316',
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
    alignItems: 'center',
  },
  bottomPriceInfo: {
    flex: 1,
    gap: 4,
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomPriceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f97316',
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepIndicator: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepIndicatorGradient: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  stepIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  stepCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  stepCircleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  stepCircleInactive: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  stepCircleCompleted: {
    borderColor: '#10b981',
    backgroundColor: '#10b981',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepNumberInactive: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepLabelContainer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.1,
    maxWidth: 100,
  },
  stepSubLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepLabelActive: {
    color: '#0a7ea4',
  },
  stepLabelInactive: {
    color: '#94a3b8',
  },
  stepLabelCompleted: {
    color: '#10b981',
  },
  stepLine: {
    height: 3,
    flex: 1,
    maxWidth: 40,
    marginHorizontal: 8,
    marginTop: -28,
    borderRadius: 2,
  },
  stepLineInactive: {
    backgroundColor: '#e2e8f0',
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  successMessageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successMessageGradient: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
    paddingHorizontal: 8,
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  successInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  couponInfoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  couponInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  couponInfoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponInfoTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  couponInfoCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a7ea4',
    letterSpacing: 1.5,
  },
  couponInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#86efac',
    marginHorizontal: 4,
  },
  couponInfoRight: {
    alignItems: 'flex-end',
  },
  couponInfoDiscount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.5,
  },
});

