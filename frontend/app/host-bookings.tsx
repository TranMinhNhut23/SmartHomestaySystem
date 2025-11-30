import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { ROOM_TYPES } from '@/types/homestay';

interface Booking {
  _id: string;
  homestay: {
    _id: string;
    name: string;
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
  guest: {
    _id: string;
    username: string;
    email: string;
  };
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guestInfo?: {
    fullName?: string;
    phone?: string;
    email?: string;
    specialRequests?: string;
  };
  createdAt: string;
}

export default function HostBookingsScreen() {
  const { user, isAuthenticated } = useAuth();
  const { getHostBookings, updateBookingStatus } = useBooking();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  
  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [createdAtDate, setCreatedAtDate] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showRoomTypeModal, setShowRoomTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để xem đơn đặt phòng', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (user?.roleName !== 'host' && user?.roleName !== 'admin') {
      Alert.alert('Không có quyền', 'Chỉ host mới có thể xem đơn đặt phòng', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && (user?.roleName === 'host' || user?.roleName === 'admin')) {
      loadBookings(pagination.page);
    }
  }, [pagination.page]);

  const loadBookings = async (page: number = pagination.page) => {
    try {
      setIsLoading(true);
      const response = await getHostBookings({
        page: page,
        limit: pagination.limit,
      });

      if (response.success && response.data) {
        setAllBookings(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.message || 'Không thể tải danh sách đơn đặt phòng');
      }
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách đơn đặt phòng');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1 }));
    loadBookings(1);
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await updateBookingStatus(bookingId, newStatus);
      if (response.success) {
        Alert.alert('Thành công', 'Cập nhật trạng thái thành công');
        loadBookings();
      } else {
        throw new Error(response.message || 'Cập nhật thất bại');
      }
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái');
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
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#6366f1';
      default:
        return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'confirmed':
        return 'Đã xác nhận';
      case 'cancelled':
        return 'Đã hủy';
      case 'completed':
        return 'Hoàn thành';
      default:
        return status;
    }
  };

  const getRoomTypeLabel = (type: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.type === type);
    return roomType?.label || type;
  };

  // Filter bookings based on search criteria
  const filteredBookings = useMemo(() => {
    let filtered = [...allBookings];

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter((booking) => booking.status === selectedStatus);
    }

    // Filter by created date
    if (createdAtDate) {
      const filterDate = new Date(createdAtDate);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((booking) => {
        const bookingDate = new Date(booking.createdAt);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate.getTime() === filterDate.getTime();
      });
    }

    // Filter by room type
    if (selectedRoomType) {
      filtered = filtered.filter((booking) => booking.room.type === selectedRoomType);
    }

    // Filter by search query (homestay name, room name, guest name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (booking) =>
          booking.homestay.name.toLowerCase().includes(query) ||
          booking.room.name.toLowerCase().includes(query) ||
          getRoomTypeLabel(booking.room.type).toLowerCase().includes(query) ||
          (booking.guestInfo?.fullName || booking.guest.username).toLowerCase().includes(query) ||
          booking.guest.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allBookings, selectedStatus, createdAtDate, selectedRoomType, searchQuery]);

  // Update displayed bookings when filters change
  useEffect(() => {
    setBookings(filteredBookings);
  }, [filteredBookings]);

  const clearFilters = () => {
    setSearchQuery('');
    setCreatedAtDate('');
    setSelectedRoomType('');
    setSelectedStatus('');
    setSelectedCalendarDate(null);
    setShowSearchFilters(false);
  };

  const hasActiveFilters = createdAtDate || selectedRoomType || searchQuery.trim() || selectedStatus;

  const toggleBookingExpand = (bookingId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    let dayOfWeek = firstDay.getDay();
    return dayOfWeek === 0 ? 7 : dayOfWeek;
  };

  const getDaysArray = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days: (number | null)[] = [];
    
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const prevMonthDays = getDaysInMonth(prevMonth);
    const daysToShow = firstDay - 1;
    
    for (let i = daysToShow; i > 0; i--) {
      days.push(prevMonthDays - i + 1);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(i);
    }
    
    return days;
  };

  const isCurrentMonth = (day: number | null, month: Date, dayIndex: number) => {
    if (day === null) return false;
    const daysInMonth = getDaysInMonth(month);
    const firstDay = getFirstDayOfMonth(month);
    return dayIndex >= firstDay - 1 && dayIndex < firstDay - 1 + daysInMonth;
  };

  const isSelectedDate = (day: number | null, month: Date) => {
    if (!selectedCalendarDate || day === null) return false;
    return (
      day === selectedCalendarDate.getDate() &&
      month.getMonth() === selectedCalendarDate.getMonth() &&
      month.getFullYear() === selectedCalendarDate.getFullYear()
    );
  };

  const handleDateSelect = (day: number | null, month: Date, dayIndex: number) => {
    if (day === null) return;
    
    if (!isCurrentMonth(day, month, dayIndex)) return;
    
    const selectedDate = new Date(month.getFullYear(), month.getMonth(), day);
    setSelectedCalendarDate(selectedDate);
    const year = selectedDate.getFullYear();
    const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(selectedDate.getDate()).padStart(2, '0');
    setCreatedAtDate(`${year}-${monthStr}-${dayStr}`);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  if (isLoading && bookings.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
      </View>
    );
  }

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
          <ThemedText style={styles.headerTitle}>Quản Lý Đơn Đặt Phòng</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color="#64748b" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên homestay, phòng, khách..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.filterToggleButton}
            onPress={() => setShowSearchFilters(!showSearchFilters)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showSearchFilters ? "options" : "options-outline"} 
              size={22} 
              color={hasActiveFilters ? "#0a7ea4" : "#64748b"} 
            />
            {hasActiveFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        {/* Advanced Filters */}
        {showSearchFilters && (
          <View style={styles.filtersPanel}>
            {/* Status Filter */}
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <View style={styles.filterLabelContainer}>
                  <Ionicons name="flag" size={16} color="#0a7ea4" />
                  <ThemedText style={styles.filterLabel}>Trạng thái</ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.statusInput, selectedStatus && styles.statusInputFilled]}
                  onPress={() => setShowStatusModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.statusInputText, selectedStatus && styles.statusInputTextFilled]}>
                    {selectedStatus ? getStatusLabel(selectedStatus) : 'Tất cả trạng thái'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <View style={styles.filterLabelContainer}>
                  <Ionicons name="calendar" size={16} color="#0a7ea4" />
                  <ThemedText style={styles.filterLabel}>Ngày đơn được tạo</ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.dateInputContainer, createdAtDate && styles.dateInputContainerFilled]}
                  onPress={() => {
                    if (createdAtDate) {
                      const date = new Date(createdAtDate);
                      setSelectedCalendarDate(date);
                      setCalendarMonth(date);
                    }
                    setShowCalendarModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.dateInputText, createdAtDate && styles.dateInputTextFilled]}>
                    {createdAtDate ? formatDate(createdAtDate) : 'Chọn ngày'}
                  </ThemedText>
                  {createdAtDate ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setCreatedAtDate('');
                        setSelectedCalendarDate(null);
                      }}
                      style={styles.clearDateButton}
                    >
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <View style={styles.filterLabelContainer}>
                  <Ionicons name="bed" size={16} color="#0a7ea4" />
                  <ThemedText style={styles.filterLabel}>Loại phòng</ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.roomTypeInput, selectedRoomType && styles.roomTypeInputFilled]}
                  onPress={() => setShowRoomTypeModal(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.roomTypeInputText, selectedRoomType && styles.roomTypeInputTextFilled]}>
                    {selectedRoomType ? getRoomTypeLabel(selectedRoomType) : 'Tất cả loại phòng'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={18} color="#ef4444" />
                <ThemedText style={styles.clearFiltersText}>Xóa bộ lọc</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={72} color="#cbd5e1" />
            </View>
            <ThemedText style={styles.emptyText}>
              {hasActiveFilters ? 'Không tìm thấy đơn đặt phòng' : 'Chưa có đơn đặt phòng nào'}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {hasActiveFilters 
                ? 'Thử thay đổi bộ lọc tìm kiếm của bạn' 
                : selectedStatus 
                  ? 'Không có đơn đặt phòng với trạng thái này' 
                  : 'Tất cả đơn đặt phòng sẽ hiển thị ở đây'}
            </ThemedText>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearFiltersButtonLarge}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={18} color="#0a7ea4" />
                <ThemedText style={styles.clearFiltersTextLarge}>Xóa bộ lọc</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {bookings.map((booking) => {
              const numberOfNights = Math.ceil(
                (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
              );
              const isExpanded = expandedBookings.has(booking._id);

              return (
                <View key={booking._id} style={styles.bookingCard}>
                  {/* Compact Header Bar */}
                <TouchableOpacity
                    style={styles.compactHeader}
                    onPress={() => toggleBookingExpand(booking._id)}
                  activeOpacity={0.7}
                >
                    <View style={styles.compactHeaderLeft}>
                      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(booking.status) }]} />
                      <View style={styles.compactInfo}>
                        <ThemedText style={styles.compactHomestayName} numberOfLines={1}>
                          {booking.homestay.name}
                        </ThemedText>
                        <View style={styles.compactCustomer}>
                          <Ionicons name="person" size={12} color="#8b5cf6" />
                          <ThemedText style={styles.compactCustomerText} numberOfLines={1}>
                            {booking.guestInfo?.fullName || booking.guest.username}
                          </ThemedText>
                        </View>
                        <View style={styles.compactMeta}>
                          <Ionicons name="calendar-outline" size={12} color="#64748b" />
                          <ThemedText style={styles.compactMetaText}>
                            {formatDate(booking.checkIn)}
                          </ThemedText>
                          <View style={styles.compactMetaDivider} />
                          <ThemedText style={styles.compactNights}>{numberOfNights} đêm</ThemedText>
                        </View>
                      </View>
                    </View>
                    <View style={styles.compactHeaderRight}>
                      <ThemedText style={styles.compactPrice}>
                        {formatPrice(booking.totalPrice)}₫
                      </ThemedText>
                      <Ionicons 
                        name={isExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#0a7ea4" 
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {/* Status & Metadata */}
                      <View style={styles.expandedHeader}>
                      <View style={[styles.statusBadge, { borderLeftColor: getStatusColor(booking.status) }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
                        <ThemedText style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                          {getStatusLabel(booking.status)}
                        </ThemedText>
                      </View>
                      <View style={styles.bookingMetaInfo}>
                        <View style={styles.bookingIdContainer}>
                          <Ionicons name="receipt-outline" size={13} color="#64748b" />
                          <ThemedText style={styles.bookingId}>#{booking._id.slice(-8)}</ThemedText>
                        </View>
                        <View style={styles.bookingDateContainer}>
                          <Ionicons name="calendar-outline" size={13} color="#64748b" />
                          <ThemedText style={styles.bookingDate}>
                            {formatDate(booking.createdAt)}
                          </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Homestay Section */}
                  <View style={styles.bookingSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="business" size={16} color="#0a7ea4" />
                      <ThemedText style={styles.sectionTitle}>Thông tin homestay</ThemedText>
                    </View>
                    <View style={styles.sectionContent}>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="business" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText} numberOfLines={1}>
                          {booking.homestay.name}
                        </ThemedText>
                      </View>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="location" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText} numberOfLines={2}>
                          {booking.homestay.address.street}, {booking.homestay.address.ward.name}, {booking.homestay.address.district.name}, {booking.homestay.address.province.name}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Guest Section */}
                  <View style={styles.bookingSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="person" size={16} color="#0a7ea4" />
                      <ThemedText style={styles.sectionTitle}>Thông tin khách</ThemedText>
                    </View>
                    <View style={styles.sectionContent}>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="person" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText} numberOfLines={1}>
                          {booking.guestInfo?.fullName || booking.guest.username}
                        </ThemedText>
                      </View>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="mail" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText} numberOfLines={1}>
                          {booking.guest.email}
                        </ThemedText>
                      </View>
                      {booking.guestInfo?.phone && (
                        <View style={styles.bookingInfoRow}>
                          <View style={styles.infoIconContainer}>
                            <Ionicons name="call" size={16} color="#0a7ea4" />
                          </View>
                          <ThemedText style={styles.bookingInfoText}>
                            {booking.guestInfo.phone}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Booking Details Section */}
                  <View style={styles.bookingSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="calendar" size={16} color="#0a7ea4" />
                      <ThemedText style={styles.sectionTitle}>Chi tiết đặt phòng</ThemedText>
                    </View>
                    <View style={styles.sectionContent}>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="bed" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText}>
                          {booking.room.name} ({getRoomTypeLabel(booking.room.type)})
                        </ThemedText>
                      </View>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="calendar" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText}>
                          {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ({numberOfNights} đêm)
                        </ThemedText>
                      </View>
                      <View style={styles.bookingInfoRow}>
                        <View style={styles.infoIconContainer}>
                          <Ionicons name="people" size={16} color="#0a7ea4" />
                        </View>
                        <ThemedText style={styles.bookingInfoText}>
                          {booking.numberOfGuests} khách
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <View style={styles.priceContainer}>
                      <View style={styles.priceLabelContainer}>
                        <Ionicons name="wallet" size={18} color="#f97316" />
                        <ThemedText style={styles.priceLabel}>Tổng giá</ThemedText>
                      </View>
                      <ThemedText style={styles.priceValue}>
                        {formatPrice(booking.totalPrice)} VNĐ
                      </ThemedText>
                    </View>

                    {booking.status === 'pending' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.confirmButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              'Xác nhận đơn đặt phòng',
                              'Bạn có chắc chắn muốn xác nhận đơn đặt phòng này?',
                              [
                                { text: 'Hủy', style: 'cancel' },
                                {
                                  text: 'Xác nhận',
                                  onPress: () => handleStatusChange(booking._id, 'confirmed'),
                                },
                              ]
                            );
                          }}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#10b981', '#34d399']}
                            style={styles.actionButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <ThemedText style={styles.actionButtonText}>Xác nhận</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.cancelButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              'Hủy đơn đặt phòng',
                              'Bạn có chắc chắn muốn hủy đơn đặt phòng này?',
                              [
                                { text: 'Không', style: 'cancel' },
                                {
                                  text: 'Hủy',
                                  style: 'destructive',
                                  onPress: () => handleStatusChange(booking._id, 'cancelled'),
                                },
                              ]
                            );
                          }}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#ef4444', '#dc2626']}
                            style={styles.actionButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Ionicons name="close-circle" size={18} color="#fff" />
                            <ThemedText style={styles.actionButtonText}>Hủy</ThemedText>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}

                    {booking.status === 'confirmed' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            'Hoàn thành đơn đặt phòng',
                            'Đánh dấu đơn đặt phòng này là đã hoàn thành?',
                            [
                              { text: 'Hủy', style: 'cancel' },
                              {
                                text: 'Hoàn thành',
                                onPress: () => handleStatusChange(booking._id, 'completed'),
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#6366f1', '#818cf8']}
                          style={styles.actionButtonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                          <ThemedText style={styles.actionButtonText}>Hoàn thành</ThemedText>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                      {/* View Full Details Button */}
                      <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => {
                          router.push({
                            pathname: '/booking-confirm',
                            params: {
                              bookingId: booking._id,
                            },
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="document-text-outline" size={16} color="#0a7ea4" />
                        <ThemedText style={styles.viewDetailsButtonText}>Xem chi tiết đầy đủ</ThemedText>
                        <Ionicons name="arrow-forward" size={16} color="#0a7ea4" />
                </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Results Count */}
            {hasActiveFilters && (
              <View style={styles.resultsCount}>
                <Ionicons name="information-circle" size={18} color="#0a7ea4" />
                <ThemedText style={styles.resultsCountText}>
                  Tìm thấy {filteredBookings.length} đơn đặt phòng
                </ThemedText>
              </View>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && !hasActiveFilters && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationButton, pagination.page === 1 && styles.paginationButtonDisabled]}
                  onPress={() => {
                    if (pagination.page > 1) {
                      setPagination({ ...pagination, page: pagination.page - 1 });
                    }
                  }}
                  disabled={pagination.page === 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={pagination.page === 1 ? "#94a3b8" : "#fff"} />
                  <ThemedText style={[styles.paginationButtonText, pagination.page === 1 && styles.paginationButtonTextDisabled]}>
                    Trước
                  </ThemedText>
                </TouchableOpacity>
                <View style={styles.paginationInfoContainer}>
                  <ThemedText style={styles.paginationInfo}>
                    Trang {pagination.page} / {pagination.pages}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.paginationButton, pagination.page === pagination.pages && styles.paginationButtonDisabled]}
                  onPress={() => {
                    if (pagination.page < pagination.pages) {
                      setPagination({ ...pagination, page: pagination.page + 1 });
                    }
                  }}
                  disabled={pagination.page === pagination.pages}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[styles.paginationButtonText, pagination.page === pagination.pages && styles.paginationButtonTextDisabled]}>
                    Sau
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={pagination.page === pagination.pages ? "#94a3b8" : "#fff"} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Room Type Modal */}
      <Modal
        visible={showRoomTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoomTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Chọn Loại Phòng</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRoomTypeModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[styles.roomTypeOption, !selectedRoomType && styles.roomTypeOptionSelected]}
                onPress={() => {
                  setSelectedRoomType('');
                  setShowRoomTypeModal(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={!selectedRoomType ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={!selectedRoomType ? "#0a7ea4" : "#64748b"} 
                />
                <ThemedText style={[styles.roomTypeOptionText, !selectedRoomType && styles.roomTypeOptionTextSelected]}>
                  Tất cả loại phòng
                </ThemedText>
              </TouchableOpacity>
              {ROOM_TYPES.map((roomType) => (
                <TouchableOpacity
                  key={roomType.type}
                  style={[styles.roomTypeOption, selectedRoomType === roomType.type && styles.roomTypeOptionSelected]}
                  onPress={() => {
                    setSelectedRoomType(roomType.type);
                    setShowRoomTypeModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={selectedRoomType === roomType.type ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={selectedRoomType === roomType.type ? "#0a7ea4" : "#64748b"} 
                  />
                  <View style={styles.roomTypeOptionContent}>
                    <ThemedText style={[styles.roomTypeOptionText, selectedRoomType === roomType.type && styles.roomTypeOptionTextSelected]}>
                      {roomType.label}
                    </ThemedText>
                    <ThemedText style={styles.roomTypeOptionDescription}>
                      {roomType.description}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Chọn Trạng Thái</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStatusModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[styles.statusOption, !selectedStatus && styles.statusOptionSelected]}
                onPress={() => {
                  setSelectedStatus('');
                  setShowStatusModal(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={!selectedStatus ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={!selectedStatus ? "#0a7ea4" : "#64748b"} 
                />
                <ThemedText style={[styles.statusOptionText, !selectedStatus && styles.statusOptionTextSelected]}>
                  Tất cả trạng thái
                </ThemedText>
              </TouchableOpacity>
              {[
                { value: 'pending', label: 'Chờ xác nhận', color: '#f59e0b', icon: 'time' },
                { value: 'confirmed', label: 'Đã xác nhận', color: '#10b981', icon: 'checkmark-circle' },
                { value: 'completed', label: 'Hoàn thành', color: '#6366f1', icon: 'trophy' },
                { value: 'cancelled', label: 'Đã hủy', color: '#ef4444', icon: 'close-circle' },
              ].map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.statusOption, selectedStatus === status.value && styles.statusOptionSelected]}
                  onPress={() => {
                    setSelectedStatus(status.value);
                    setShowStatusModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={selectedStatus === status.value ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={selectedStatus === status.value ? "#0a7ea4" : "#64748b"} 
                  />
                  <View style={styles.statusOptionContent}>
                    <View style={[styles.statusOptionDot, { backgroundColor: status.color }]} />
                    <ThemedText style={[styles.statusOptionText, selectedStatus === status.value && styles.statusOptionTextSelected]}>
                      {status.label}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('prev')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-up" size={20} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.calendarMonthYear}>
                {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </ThemedText>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('next')}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarDaysHeader}>
              {dayNames.map((day) => (
                <View key={day} style={styles.calendarDayHeader}>
                  <ThemedText style={styles.calendarDayHeaderText}>{day}</ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {(() => {
                const days = getDaysArray(calendarMonth);
                const firstDay = getFirstDayOfMonth(calendarMonth);
                const daysInMonth = getDaysInMonth(calendarMonth);
                
                return days.map((day, index) => {
                  const isCurrentMonthDay = isCurrentMonth(day, calendarMonth, index);
                  const isSelected = isSelectedDate(day, calendarMonth);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !isCurrentMonthDay && styles.calendarDayOtherMonth,
                        isSelected && styles.calendarDaySelected,
                      ]}
                      onPress={() => handleDateSelect(day, calendarMonth, index)}
                      disabled={!isCurrentMonthDay}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.calendarDayText,
                          !isCurrentMonthDay && styles.calendarDayTextOtherMonth,
                          isSelected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {day}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
            <TouchableOpacity
              style={styles.calendarConfirmButton}
              onPress={() => setShowCalendarModal(false)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.calendarConfirmButtonText}>Xác nhận</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  searchContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#11181C',
    fontWeight: '500',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  filterToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  filtersPanel: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterItem: {
    flex: 1,
    gap: 6,
  },
  filterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 40,
  },
  dateInputContainerFilled: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  dateInputText: {
    flex: 1,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  dateInputTextFilled: {
    color: '#11181C',
    fontWeight: '600',
  },
  clearDateButton: {
    padding: 4,
    marginLeft: 8,
  },
  statusInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 40,
  },
  statusInputFilled: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  statusInputText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    flex: 1,
  },
  statusInputTextFilled: {
    color: '#11181C',
    fontWeight: '600',
  },
  roomTypeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 40,
  },
  roomTypeInputFilled: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  roomTypeInputText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    flex: 1,
  },
  roomTypeInputTextFilled: {
    color: '#11181C',
    fontWeight: '600',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  clearFiltersButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  clearFiltersTextLarge: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  resultsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  resultsCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    padding: 16,
  },
  roomTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 12,
  },
  roomTypeOptionSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  roomTypeOptionContent: {
    flex: 1,
    gap: 4,
  },
  roomTypeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  roomTypeOptionTextSelected: {
    color: '#0a7ea4',
  },
  roomTypeOptionDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    gap: 12,
  },
  statusOptionSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  statusOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  statusOptionTextSelected: {
    color: '#0a7ea4',
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: '#2d3748',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calendarDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarDayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a0aec0',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: '#60a5fa',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  calendarDayTextOtherMonth: {
    color: '#718096',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarConfirmButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  calendarConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIndicator: {
    width: 4,
    height: 56,
    borderRadius: 2,
  },
  compactInfo: {
    flex: 1,
    gap: 6,
  },
  compactHomestayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  compactCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCustomerText: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '700',
    flex: 1,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactMetaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  compactMetaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  compactNights: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '700',
  },
  compactHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  compactPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f97316',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0a7ea4',
    marginTop: 12,
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  bookingMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bookingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  bookingId: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  bookingDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  bookingDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  bookingSection: {
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  sectionContent: {
    gap: 10,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  bookingInfoText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
    lineHeight: 19,
  },
  bookingFooter: {
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#e2e8f0',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  priceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: '#78350f',
    fontWeight: '700',
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#f97316',
    letterSpacing: 0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButton: {
    backgroundColor: 'transparent',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  completeButton: {
    backgroundColor: 'transparent',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0a7ea4',
    gap: 6,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationButtonDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  paginationButtonTextDisabled: {
    color: '#94a3b8',
  },
  paginationInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '700',
  },
});


