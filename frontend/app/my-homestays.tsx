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
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';
import { ROOM_TYPES } from '@/types/homestay';

interface Homestay {
  _id: string;
  name: string;
  description: string;
  address: {
    province: { name: string };
    district: { name: string };
    ward: { name: string };
    street: string;
  };
  pricePerNight: number;
  images: string[];
  status: string;
  featured: boolean;
  rooms?: any[];
  amenities?: string[];
  createdAt: string;
  rejectedReason?: string;
}

export default function MyHomestaysScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [createdAtDate, setCreatedAtDate] = useState<string>('');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để xem homestay của bạn', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (user?.roleName !== 'host' && user?.roleName !== 'admin') {
      Alert.alert('Không có quyền', 'Chỉ host mới có thể quản lý homestay', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    loadHomestays();
  }, [isAuthenticated, user]);

  const loadHomestays = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHostHomestays();
      if (response.success && response.data) {
        setHomestays(response.data);
      } else {
        throw new Error(response.message || 'Không thể tải danh sách homestay');
      }
    } catch (error: any) {
      console.error('Error loading homestays:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách homestay');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomestays();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'inactive':
        return '#6b7280';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'pending':
        return 'Chờ duyệt';
      case 'inactive':
        return 'Ngừng hoạt động';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return status;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getFullAddress = (homestay: Homestay) => {
    const { street, ward, district, province } = homestay.address;
    return `${street}, ${ward.name}, ${district.name}, ${province.name}`;
  };

  const getRoomTypeLabel = (type: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.type === type);
    return roomType?.label || type;
  };

  // Filter homestays based on search criteria
  const filteredHomestays = useMemo(() => {
    let filtered = [...homestays];

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter((homestay) => homestay.status === selectedStatus);
    }

    // Filter by created date
    if (createdAtDate) {
      const filterDate = new Date(createdAtDate);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((homestay) => {
        const homestayDate = new Date(homestay.createdAt);
        homestayDate.setHours(0, 0, 0, 0);
        return homestayDate.getTime() === filterDate.getTime();
      });
    }

    // Filter by search query (name, description, address)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (homestay) =>
          homestay.name.toLowerCase().includes(query) ||
          homestay.description.toLowerCase().includes(query) ||
          getFullAddress(homestay).toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [homestays, selectedStatus, createdAtDate, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setCreatedAtDate('');
    setSelectedStatus('');
    setSelectedCalendarDate(null);
    setShowSearchFilters(false);
    setCurrentPage(1); // Reset về trang đầu khi clear filters
  };

  const hasActiveFilters = createdAtDate || searchQuery.trim() || selectedStatus;

  // Pagination calculations
  const totalPages = Math.ceil(filteredHomestays.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHomestays = filteredHomestays.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, createdAtDate, searchQuery]);

  const getRoomTypeGroups = (rooms: any[]) => {
    if (!rooms || rooms.length === 0) return [];
    const groups: { [key: string]: { type: string; label: string; count: number; prices: number[] } } = {};
    rooms.forEach((room: any) => {
      if (!groups[room.type]) {
        groups[room.type] = {
          type: room.type,
          label: getRoomTypeLabel(room.type),
          count: 0,
          prices: [],
        };
      }
      groups[room.type].count++;
      if (room.pricePerNight) {
        groups[room.type].prices.push(room.pricePerNight);
      }
    });
    return Object.values(groups).map((group) => ({
      ...group,
      minPrice: group.prices.length > 0 ? Math.min(...group.prices) : 0,
      maxPrice: group.prices.length > 0 ? Math.max(...group.prices) : 0,
    }));
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

  if (isLoading && homestays.length === 0) {
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
          <ThemedText style={styles.headerTitle}>Quản Lý Homestay</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-homestay')}
            activeOpacity={0.7}
          >
            <View style={styles.addButtonInner}>
              <Ionicons name="add" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
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
            placeholder="Tìm kiếm theo tên homestay, mô tả, địa chỉ..."
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
                    {selectedStatus ? getStatusText(selectedStatus) : 'Tất cả trạng thái'}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <View style={styles.filterLabelContainer}>
                  <Ionicons name="calendar" size={16} color="#0a7ea4" />
                  <ThemedText style={styles.filterLabel}>Ngày tạo homestay</ThemedText>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredHomestays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="home-outline" size={72} color="#cbd5e1" />
            </View>
            <ThemedText style={styles.emptyTitle}>
              {homestays.length === 0 
                ? 'Chưa có homestay nào' 
                : hasActiveFilters 
                  ? 'Không tìm thấy homestay' 
                  : 'Không có homestay nào'}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {homestays.length === 0
                ? 'Bắt đầu bằng cách tạo homestay đầu tiên của bạn'
                : hasActiveFilters
                  ? 'Thử thay đổi bộ lọc tìm kiếm của bạn'
                  : 'Tất cả homestay của bạn sẽ hiển thị ở đây'}
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
            {homestays.length === 0 && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/add-homestay')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#0a7ea4', '#0d8bb8']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add-circle" size={22} color="#fff" />
                  <ThemedText style={styles.emptyButtonText}>Tạo Homestay Mới</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {currentHomestays.map((homestay, index) => {
              const orderNumber = startIndex + index + 1;
              return (
              <View key={homestay._id} style={[styles.homestayCard, { backgroundColor: '#fff' }]}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTop}>
                    {/* Order Number */}
                    <View style={styles.orderNumberBadge}>
                      <ThemedText style={styles.orderNumberText}>#{orderNumber}</ThemedText>
                    </View>
                    
                    {/* Homestay Name - Centered */}
                    <View style={styles.cardTitleContainer}>
                      <ThemedText style={styles.cardTitle} numberOfLines={2}>
                        {homestay.name}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(homestay.status) },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: '#fff' }]} />
                      <ThemedText style={styles.statusText}>
                        {getStatusText(homestay.status)}
                      </ThemedText>
                    </View>
                  </View>
                  {homestay.featured && (
                    <View style={styles.featuredBadge}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <ThemedText style={styles.featuredText}>Nổi bật</ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.cardContent}>
                  {/* Description */}
                  <ThemedText style={styles.cardDescription} numberOfLines={3}>
                    {homestay.description}
                  </ThemedText>

                  {/* Rejected Reason */}
                  {homestay.status === 'rejected' && homestay.rejectedReason && (
                    <View style={styles.rejectedReasonContainer}>
                      <View style={styles.rejectedReasonHeader}>
                        <Ionicons name="alert-circle" size={18} color="#ef4444" />
                        <ThemedText style={styles.rejectedReasonTitle}>Lý do từ chối:</ThemedText>
                      </View>
                      <ThemedText style={styles.rejectedReasonText}>
                        {homestay.rejectedReason}
                      </ThemedText>
                    </View>
                  )}

                  {/* Address */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="location-outline" size={18} color="#0a7ea4" />
                    </View>
                    <ThemedText style={styles.infoText} numberOfLines={2}>
                      {getFullAddress(homestay)}
                    </ThemedText>
                  </View>

                  {/* Rooms Detail */}
                  {homestay.rooms && homestay.rooms.length > 0 && (
                    <View style={styles.roomsSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="bed-outline" size={18} color="#0a7ea4" />
                        <ThemedText style={styles.sectionTitle}>Phòng ({homestay.rooms.length})</ThemedText>
                      </View>
                      {getRoomTypeGroups(homestay.rooms).map((group, idx) => (
                        <View key={idx} style={styles.roomTypeItem}>
                          <View style={styles.roomTypeInfo}>
                            <ThemedText style={styles.roomTypeLabel}>{group.label}</ThemedText>
                            <ThemedText style={styles.roomTypeCount}>{group.count} phòng</ThemedText>
                          </View>
                          <ThemedText style={styles.roomTypePrice}>
                            {group.minPrice === group.maxPrice || group.maxPrice === 0
                              ? `${formatPrice(group.minPrice)}đ/đêm`
                              : `${formatPrice(group.minPrice)} - ${formatPrice(group.maxPrice)}đ/đêm`}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Amenities */}
                  {homestay.amenities && homestay.amenities.length > 0 && (
                    <View style={styles.amenitiesSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="sparkles-outline" size={18} color="#0a7ea4" />
                        <ThemedText style={styles.sectionTitle}>Tiện ích ({homestay.amenities.length})</ThemedText>
                      </View>
                      <View style={styles.amenitiesList}>
                        {homestay.amenities.slice(0, 6).map((amenity, idx) => (
                          <View key={idx} style={styles.amenityTag}>
                            <ThemedText style={styles.amenityText}>{amenity}</ThemedText>
                          </View>
                        ))}
                        {homestay.amenities.length > 6 && (
                          <View style={styles.amenityTag}>
                            <ThemedText style={styles.amenityText}>+{homestay.amenities.length - 6} khác</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Info Grid */}
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="cash-outline" size={18} color="#10b981" />
                      </View>
                      <ThemedText style={styles.infoItemLabel}>Giá tối thiểu</ThemedText>
                      <ThemedText style={styles.infoItemValue}>
                        {formatPrice(homestay.pricePerNight)}đ/đêm
                      </ThemedText>
                    </View>

                    <View style={styles.infoItem}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="time-outline" size={18} color="#64748b" />
                      </View>
                      <ThemedText style={styles.infoItemLabel}>Ngày tạo</ThemedText>
                      <ThemedText style={styles.infoItemValue}>
                        {formatDate(homestay.createdAt)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => router.push(`/edit-homestay?id=${homestay._id}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={18} color="#0a7ea4" />
                      <ThemedText style={styles.editButtonText}>Chỉnh sửa</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => router.push(`/homestay-detail?id=${homestay._id}`)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#0a7ea4', '#0d8bb8']}
                        style={styles.viewButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="eye-outline" size={18} color="#fff" />
                        <ThemedText style={styles.viewButtonText}>Xem chi tiết</ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              );
            })}
          </View>
        )}

        {/* Results Count */}
        {hasActiveFilters && filteredHomestays.length > 0 && (
          <View style={styles.resultsCount}>
            <Ionicons name="information-circle" size={18} color="#0a7ea4" />
            <ThemedText style={styles.resultsCountText}>
              Tìm thấy {filteredHomestays.length} homestay
            </ThemedText>
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                }
              }}
              disabled={currentPage === 1}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? "#94a3b8" : "#fff"} />
              <ThemedText style={[styles.paginationButtonText, currentPage === 1 && styles.paginationButtonTextDisabled]}>
                Trước
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.paginationPages}>
              {/* Show page numbers */}
              {(() => {
                const pages = [];
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);

                // Adjust if near the start
                if (endPage - startPage < 4) {
                  if (startPage === 1) {
                    endPage = Math.min(totalPages, startPage + 4);
                  } else if (endPage === totalPages) {
                    startPage = Math.max(1, endPage - 4);
                  }
                }

                // First page
                if (startPage > 1) {
                  pages.push(
                    <TouchableOpacity
                      key={1}
                      style={[styles.paginationPageButton, currentPage === 1 && styles.paginationPageButtonActive]}
                      onPress={() => setCurrentPage(1)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.paginationPageText, currentPage === 1 && styles.paginationPageTextActive]}>
                        1
                      </ThemedText>
                    </TouchableOpacity>
                  );
                  if (startPage > 2) {
                    pages.push(
                      <View key="ellipsis1" style={styles.paginationEllipsis}>
                        <ThemedText style={styles.paginationEllipsisText}>...</ThemedText>
                      </View>
                    );
                  }
                }

                // Page range
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <TouchableOpacity
                      key={i}
                      style={[styles.paginationPageButton, currentPage === i && styles.paginationPageButtonActive]}
                      onPress={() => setCurrentPage(i)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.paginationPageText, currentPage === i && styles.paginationPageTextActive]}>
                        {i}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }

                // Last page
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <View key="ellipsis2" style={styles.paginationEllipsis}>
                        <ThemedText style={styles.paginationEllipsisText}>...</ThemedText>
                      </View>
                    );
                  }
                  pages.push(
                    <TouchableOpacity
                      key={totalPages}
                      style={[styles.paginationPageButton, currentPage === totalPages && styles.paginationPageButtonActive]}
                      onPress={() => setCurrentPage(totalPages)}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.paginationPageText, currentPage === totalPages && styles.paginationPageTextActive]}>
                        {totalPages}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                }

                return pages;
              })()}
            </View>

            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={() => {
                if (currentPage < totalPages) {
                  setCurrentPage(currentPage + 1);
                }
              }}
              disabled={currentPage === totalPages}
              activeOpacity={0.7}
            >
              <ThemedText style={[styles.paginationButtonText, currentPage === totalPages && styles.paginationButtonTextDisabled]}>
                Sau
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? "#94a3b8" : "#fff"} />
            </TouchableOpacity>
          </View>
        )}

        {/* Pagination Info */}
        {totalPages > 1 && (
          <View style={styles.paginationInfo}>
            <ThemedText style={styles.paginationInfoText}>
              Hiển thị {startIndex + 1}-{Math.min(endIndex, filteredHomestays.length)} / {filteredHomestays.length} homestay
            </ThemedText>
          </View>
        )}
      </ScrollView>

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
                { value: 'active', label: 'Đang hoạt động', color: '#10b981', icon: 'checkmark-circle' },
                { value: 'pending', label: 'Chờ duyệt', color: '#f59e0b', icon: 'time' },
                { value: 'rejected', label: 'Đã từ chối', color: '#ef4444', icon: 'close-circle' },
                { value: 'inactive', label: 'Ngừng hoạt động', color: '#6b7280', icon: 'pause-circle' },
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
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listContainer: {
    gap: 20,
  },
  homestayCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  orderNumberBadge: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  orderNumberText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 5,
    alignSelf: 'flex-start',
  },
  featuredText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
    flexShrink: 0,
    minHeight: 28,
    maxHeight: 28,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
  cardContent: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.3,
    lineHeight: 26,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  rejectedReasonContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  rejectedReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rejectedReasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  rejectedReasonText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
  roomsSection: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
    letterSpacing: 0.2,
  },
  roomTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomTypeInfo: {
    flex: 1,
    gap: 4,
  },
  roomTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  roomTypeCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  roomTypePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  amenitiesSection: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amenityText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 4,
  },
  infoItemValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: '#fff',
    gap: 8,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
    letterSpacing: 0.2,
  },
  viewButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  viewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#f1f5f9',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
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
  paginationPages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  paginationPageButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  paginationPageButtonActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  paginationPageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  paginationPageTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  paginationEllipsis: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationEllipsisText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  paginationInfo: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paginationInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});


