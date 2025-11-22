import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getHomestayImageUrl } from '@/services/api';
import { ROOM_TYPES, AMENITIES } from '@/types/homestay';
import { normalizeAmenitiesFromDB } from '@/utils/homestayValidation';

const { width } = Dimensions.get('window');

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
  requireDeposit: boolean;
  rooms?: Array<{
    _id: string;
    type: string;
    name: string;
    pricePerNight: number;
    status: string;
    maxGuests?: number;
  }>;
  amenities?: string[];
  host?: {
    _id?: string;
    username: string;
    email: string;
    avatar?: string;
  } | string;
  googleMapsEmbed?: string;
}

export default function HomestayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [homestay, setHomestay] = useState<Homestay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [showRoomBookingModal, setShowRoomBookingModal] = useState(false);
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Array<{_id: string; name: string; type: string; pricePerNight: number; maxGuests: number}>>([]);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState<Date | null>(null);
  const [tempCheckOut, setTempCheckOut] = useState<Date | null>(null);

  useEffect(() => {
    if (id) {
      loadHomestay();
    }
  }, [id]);

  const loadHomestay = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHomestayById(id!);
      if (response.success && response.data) {
        // Normalize amenities từ DB về format của AMENITIES constant
        const homestayData = response.data;
        if (homestayData.amenities) {
          homestayData.amenities = normalizeAmenitiesFromDB(homestayData.amenities, AMENITIES);
        }
        setHomestay(homestayData);
      } else {
        throw new Error(response.message || 'Không thể tải thông tin homestay');
      }
    } catch (error: any) {
      console.error('Error loading homestay:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin homestay', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || isNaN(price)) return '0';
    return new Intl.NumberFormat('vi-VN').format(price);
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

  const getRoomTypeLabel = (type: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.type === type);
    return roomType?.label || type;
  };

  // Group rooms theo type
  const getRoomTypes = () => {
    if (!homestay?.rooms) return [];
    const types = new Set(homestay.rooms.map((room) => room.type));
    return Array.from(types).map((type) => {
      const roomTypeInfo = ROOM_TYPES.find((rt) => rt.type === type);
      const roomsOfType = homestay.rooms!.filter((r) => r.type === type);
      const minPrice = Math.min(...roomsOfType.map((r) => r.pricePerNight));
      const maxPrice = Math.max(...roomsOfType.map((r) => r.pricePerNight));
      
      return {
        type,
        label: roomTypeInfo?.label || type,
        description: roomTypeInfo?.description || '',
        count: roomsOfType.length,
        minPrice,
        maxPrice,
        rooms: roomsOfType,
      };
    });
  };

  const handleSelectRoomType = (roomType: string) => {
    setSelectedRoomType(roomType);
    setCheckIn('');
    setCheckOut('');
    setAvailableRooms([]);
    setSelectedRoomForBooking(null);
    setShowRoomBookingModal(true);
  };

  const checkAvailability = async () => {
    if (!checkIn || !checkOut || !selectedRoomType || !homestay) return;

    try {
      setIsCheckingAvailability(true);
      const roomsOfType = homestay.rooms?.filter((r) => r.type === selectedRoomType) || [];
      const available: Array<{_id: string; name: string; type: string; pricePerNight: number; maxGuests: number}> = [];

      for (const room of roomsOfType) {
        try {
          const response = await apiService.checkRoomAvailability(room._id, checkIn, checkOut);
          if (response.success && response.data?.available) {
            available.push({
              _id: room._id,
              name: room.name,
              type: room.type,
              pricePerNight: room.pricePerNight,
              maxGuests: room.maxGuests || 2,
            });
          }
        } catch (error) {
          console.error(`Error checking availability for room ${room._id}:`, error);
        }
      }

      setAvailableRooms(available);
      setSelectedRoomForBooking(null); // Reset selection when availability changes
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (checkIn && checkOut && selectedRoomType) {
      checkAvailability();
    } else {
      setAvailableRooms([]);
    }
  }, [checkIn, checkOut, selectedRoomType]);

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return '';
    }
  };

  const formatDateFull = (dateString: string | undefined | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      const dayName = days[date.getDay()] || '';
      return `${dayName}, ${date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}`;
    } catch (error) {
      return '';
    }
  };

  const getDateInfo = (dateString: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return {
        dayName: days[date.getDay()] || '',
        day: date.getDate() || 0,
        month: date.getMonth() + 1 || 0,
        year: date.getFullYear() || 0,
        fullDate: formatDateFull(dateString),
      };
    } catch (error) {
      return null;
    }
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    let dayOfWeek = firstDay.getDay();
    return dayOfWeek === 0 ? 7 : dayOfWeek;
  };

  const getCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days: (number | null)[] = [];

    // Add previous month's days
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const prevMonthDays = getDaysInMonth(prevMonth);
    const daysToShow = firstDay - 1;
    
    for (let i = daysToShow; i > 0; i--) {
      days.push(prevMonthDays - i + 1);
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    // Add next month's days to fill the grid
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

  const handleCalendarDateSelect = (day: number | null, type: 'checkIn' | 'checkOut') => {
    if (day === null) return;
    const days = getCalendarDays(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const daysInMonth = getDaysInMonth(calendarMonth);
    const dayIndex = days.findIndex((d, idx) => d === day && idx >= firstDay - 1 && idx < firstDay - 1 + daysInMonth);
    
    if (dayIndex === -1 || !isCurrentMonth(day, calendarMonth, dayIndex)) return;

    const selectedDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) return;

    if (type === 'checkIn') {
      setTempCheckIn(selectedDate);
      const year = selectedDate.getFullYear();
      const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selectedDate.getDate()).padStart(2, '0');
      setCheckIn(`${year}-${monthStr}-${dayStr}`);
      setShowCheckInPicker(false);
      
      // Reset checkOut if it's before or equal to checkIn
      if (checkOut && new Date(checkOut) <= selectedDate) {
        setCheckOut('');
      }
    } else {
      if (checkIn && selectedDate <= new Date(checkIn)) {
        Alert.alert('Lỗi', 'Ngày trả phòng phải sau ngày nhận phòng');
        return;
      }
      setTempCheckOut(selectedDate);
      const year = selectedDate.getFullYear();
      const monthStr = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(selectedDate.getDate()).padStart(2, '0');
      setCheckOut(`${year}-${monthStr}-${dayStr}`);
      setShowCheckOutPicker(false);
    }
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

  const handleBookRoom = () => {
    if (!selectedRoomType || !checkIn || !checkOut || !selectedRoomForBooking) {
      Alert.alert('Lỗi', 'Vui lòng chọn phòng để đặt');
      return;
    }

    const selectedRoom = availableRooms.find(r => r._id === selectedRoomForBooking);
    if (!selectedRoom) {
      Alert.alert('Lỗi', 'Phòng đã chọn không còn khả dụng');
      return;
    }

    // Navigate to booking page with selected room info
    router.push({
      pathname: '/booking',
      params: {
        homestayId: homestay!._id,
        roomId: selectedRoom._id,
        roomName: selectedRoom.name,
        roomType: selectedRoom.type,
        roomPricePerNight: selectedRoom.pricePerNight.toString(),
        roomMaxGuests: selectedRoom.maxGuests.toString(),
        checkIn,
        checkOut,
      },
    });
  };

  // Parse iframe HTML để lấy src URL
  const getMapEmbedUrl = (embedHtml: string): string | null => {
    if (!embedHtml) return null;
    
    // Tìm src trong iframe (hỗ trợ cả single và double quotes)
    const srcMatch = embedHtml.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
    
    // Nếu không tìm thấy trong iframe, kiểm tra xem có phải là URL trực tiếp không
    if (embedHtml.trim().startsWith('http://') || embedHtml.trim().startsWith('https://')) {
      return embedHtml.trim();
    }
    
    return null;
  };

  // Tạo HTML để render trong WebView
  const getMapSource = (embedHtml: string) => {
    if (!embedHtml) {
      return {
        html: '<html><body><p style="padding: 20px; text-align: center; color: #666;">Không có bản đồ</p></body></html>',
      };
    }

    const mapUrl = getMapEmbedUrl(embedHtml);
    
    // Nếu embedHtml đã là iframe HTML đầy đủ, dùng luôn
    if (embedHtml.includes('<iframe')) {
      return {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                }
                iframe {
                  width: 100%;
                  height: 100%;
                  border: 0;
                }
              </style>
            </head>
            <body>
              ${embedHtml}
            </body>
          </html>
        `,
      };
    }

    // Nếu có URL, tạo iframe
    if (mapUrl) {
      return {
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                html, body {
                  width: 100%;
                  height: 100%;
                  overflow: hidden;
                }
                iframe {
                  width: 100%;
                  height: 100%;
                  border: 0;
                }
              </style>
            </head>
            <body>
              <iframe
                src="${mapUrl}"
                width="100%"
                height="100%"
                style="border:0;"
                allowfullscreen=""
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
            </body>
          </html>
        `,
      };
    }

    // Fallback nếu không parse được
    return {
      html: '<html><body><p style="padding: 20px; text-align: center; color: #666;">Không thể tải bản đồ</p></body></html>',
    };
  };

  const isOwner = user && homestay && (
    (typeof homestay.host === 'object' && homestay.host?._id && user._id === homestay.host._id) ||
    (typeof homestay.host === 'string' && user._id === homestay.host)
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
      </View>
    );
  }

  if (!homestay) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#fff' }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image with Overlay */}
        {homestay.images && homestay.images.length > 0 && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getHomestayImageUrl(homestay.images[currentImageIndex]) || '' }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            
            {/* Header Overlay */}
            <View style={styles.imageHeaderOverlay}>
              <TouchableOpacity
                style={styles.imageHeaderButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <View style={styles.imageHeaderButtonInner}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </View>
              </TouchableOpacity>
              
              <View style={styles.imageHeaderRight}>
                <TouchableOpacity
                  style={styles.imageHeaderButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.imageHeaderButtonInner}>
                    <Ionicons name="share-outline" size={22} color="#fff" />
                  </View>
                </TouchableOpacity>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.imageHeaderButton}
                    onPress={() => router.push(`/edit-homestay?id=${homestay._id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.imageHeaderButtonInner}>
                      <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Image Counter */}
            {homestay.images.length > 1 && (
              <View style={styles.imageCounter}>
                <Ionicons name="camera" size={16} color="#fff" />
                <ThemedText style={styles.imageCounterText}>
                  {currentImageIndex + 1}/{homestay.images.length}
                </ThemedText>
              </View>
            )}

            {/* Image Navigation */}
            {homestay.images.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.imageNavButtonLeft]}
                    onPress={() => setCurrentImageIndex(currentImageIndex - 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                {currentImageIndex < homestay.images.length - 1 && (
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.imageNavButtonRight]}
                    onPress={() => setCurrentImageIndex(currentImageIndex + 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Title and Info Overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageOverlay}
            >
              <View style={styles.imageOverlayContent}>
                <ThemedText style={styles.imageOverlayTitle}>{homestay.name}</ThemedText>
                <View style={styles.imageOverlayBadges}>
                  <View style={styles.imageOverlayBadge}>
                    <ThemedText style={styles.imageOverlayBadgeText}>Homestay</ThemedText>
                  </View>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3].map((star) => (
                      <Ionicons key={star} name="star" size={16} color="#fbbf24" />
                    ))}
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Rating and Location Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardRow}>
            <View style={styles.ratingSection}>
              <ThemedText style={styles.ratingNumber}>6.3/10</ThemedText>
              <ThemedText style={styles.ratingLabel}>Hài lòng</ThemedText>
              <ThemedText style={styles.ratingCount}>2 đánh giá</ThemedText>
              <TouchableOpacity style={styles.ratingArrow}>
                <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
              </TouchableOpacity>
            </View>
            <View style={styles.locationSection}>
              <ThemedText style={styles.locationText}>
                {homestay.address.district.name}, {homestay.address.province.name}
              </ThemedText>
              <View style={styles.locationDetails}>
                <Ionicons name="location" size={14} color="#64748b" />
                <ThemedText style={styles.locationDetailText}>Gần khu mua sắm</ThemedText>
              </View>
              <View style={styles.locationDetails}>
                <Ionicons name="location" size={14} color="#64748b" />
                <ThemedText style={styles.locationDetailText}>Gần trung tâm thành phố</ThemedText>
                <TouchableOpacity style={styles.mapButton}>
                  <ThemedText style={styles.mapButtonText}>Bản đồ</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Amenities Quick View */}
        {homestay.amenities && Array.isArray(homestay.amenities) && homestay.amenities.length > 0 && (
          <TouchableOpacity 
            style={styles.amenitiesQuickCard} 
            activeOpacity={0.7}
            onPress={() => {
              console.log('Opening amenities modal, amenities:', homestay.amenities);
              setShowAmenitiesModal(true);
            }}
          >
            <Ionicons name="sparkles" size={20} color="#0a7ea4" />
            <ThemedText style={styles.amenitiesQuickText}>Tiện ích</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        )}

        {/* Description Section */}
        <View style={styles.descriptionCard}>
          <View style={styles.descriptionHeader}>
            <ThemedText style={styles.descriptionTitle}>Giới thiệu cơ sở lưu trú</ThemedText>
            <TouchableOpacity style={styles.seeMoreButton}>
              <ThemedText style={styles.seeMoreText}>Xem thêm</ThemedText>
              <Ionicons name="chevron-forward" size={16} color="#0a7ea4" />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.descriptionText} numberOfLines={3}>
            {homestay.description}
          </ThemedText>
        </View>

        {/* Address */}
        {homestay.address && (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <ThemedText style={styles.descriptionTitle}>Địa chỉ</ThemedText>
            </View>
            <View style={styles.addressContent}>
              <Ionicons name="location" size={18} color="#0a7ea4" />
              <ThemedText style={styles.addressText}>
                {[
                  homestay.address.street,
                  homestay.address.ward?.name,
                  homestay.address.district?.name,
                  homestay.address.province?.name,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Rooms by Type */}
        {homestay.rooms && homestay.rooms.length > 0 && (
          <View style={[styles.section, styles.roomsSection]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed" size={20} color="#0a7ea4" />
              <ThemedText style={styles.sectionTitle}>Phòng</ThemedText>
            </View>
            <View style={styles.roomTypesList}>
              {getRoomTypes().map((roomType) => (
                <TouchableOpacity
                  key={roomType.type}
                  style={styles.roomTypeCard}
                  onPress={() => handleSelectRoomType(roomType.type)}
                  activeOpacity={0.7}
                >
                  <View style={styles.roomTypeCardHeader}>
                    <View style={styles.roomTypeIconContainer}>
                      <Ionicons name="bed" size={20} color="#0a7ea4" />
                    </View>
                    <View style={styles.roomTypeInfo}>
                      <ThemedText style={styles.roomTypeName}>{roomType.label}</ThemedText>
                      <ThemedText style={styles.roomTypeDescription} numberOfLines={2}>
                        {roomType.description}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.roomTypeCardFooter}>
                    <View style={styles.roomTypeStats}>
                      <View style={styles.roomTypeStatItem}>
                        <Ionicons name="home" size={14} color="#64748b" />
                        <ThemedText style={styles.roomTypeStatText}>
                          {roomType.count} phòng
                        </ThemedText>
                      </View>
                      <View style={styles.roomTypeStatItem}>
                        <Ionicons name="cash" size={14} color="#0a7ea4" />
                        <ThemedText style={styles.roomTypePriceText}>
                          {roomType.minPrice === roomType.maxPrice
                            ? `${formatPrice(roomType.minPrice)} VNĐ/đêm`
                            : `${formatPrice(roomType.minPrice)} - ${formatPrice(roomType.maxPrice)} VNĐ/đêm`}
                        </ThemedText>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}


        {/* Google Maps */}
        {homestay.googleMapsEmbed && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="map" size={20} color="#0a7ea4" />
              <ThemedText style={styles.sectionTitle}>Bản đồ</ThemedText>
            </View>
            <TouchableOpacity
              style={styles.mapPreviewContainer}
              onPress={() => setShowMapModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.mapPreviewContent}>
                <View style={styles.mapPreviewIconContainer}>
                  <Ionicons name="map" size={32} color="#0a7ea4" />
                </View>
                <View style={styles.mapPreviewTextContainer}>
                  <ThemedText style={styles.mapPreviewTitle}>Xem bản đồ</ThemedText>
                  <ThemedText style={styles.mapPreviewSubtitle}>
                    Nhấn để xem vị trí trên bản đồ
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#0a7ea4" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Host Info */}
        {homestay.host && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#0a7ea4" />
              <ThemedText style={styles.sectionTitle}>Chủ nhà</ThemedText>
            </View>
            <ThemedText style={styles.hostText}>
              {typeof homestay.host === 'object' ? homestay.host.username : 'Chủ nhà'}
            </ThemedText>
          </View>
        )}
      </ScrollView>


      {/* Amenities Modal */}
      <Modal
        visible={showAmenitiesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAmenitiesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAmenitiesModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Tiện ích</ThemedText>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAmenitiesModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {homestay && homestay.amenities && Array.isArray(homestay.amenities) && homestay.amenities.length > 0 ? (
                <View style={styles.modalAmenitiesList}>
                  {homestay.amenities
                    .filter((amenity) => amenity && typeof amenity === 'string')
                    .map((amenity, index) => (
                      <View key={index} style={styles.modalAmenityItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#0a7ea4" />
                        <ThemedText style={styles.modalAmenityText}>{amenity}</ThemedText>
                      </View>
                    ))}
                </View>
              ) : (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="sparkles-outline" size={48} color="#94a3b8" />
                  <ThemedText style={styles.modalEmptyText}>
                    Chưa có tiện ích nào được liệt kê
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Room Booking Modal */}
      <Modal
        visible={showRoomBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowRoomBookingModal(false);
          setSelectedRoomType(null);
          setCheckIn('');
          setCheckOut('');
          setAvailableRooms([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowRoomBookingModal(false);
              setSelectedRoomType(null);
              setCheckIn('');
              setCheckOut('');
              setAvailableRooms([]);
            }}
          />
          <View style={styles.roomBookingModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconContainer}>
                  <Ionicons name="bed" size={24} color="#0a7ea4" />
                </View>
                <View>
                  <ThemedText style={styles.modalTitle}>
                    {selectedRoomType ? getRoomTypeLabel(selectedRoomType) : 'Chọn phòng'}
                  </ThemedText>
                  <ThemedText style={styles.modalSubtitle}>
                    Chọn ngày để kiểm tra phòng còn trống
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowRoomBookingModal(false);
                  setSelectedRoomType(null);
                  setCheckIn('');
                  setCheckOut('');
                  setAvailableRooms([]);
                  setSelectedRoomForBooking(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.roomBookingModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Date Selection */}
              <View style={styles.roomBookingDateSection}>
                <View style={styles.roomBookingDateRow}>
                  <TouchableOpacity
                    style={[styles.roomBookingDateCard, checkIn && styles.roomBookingDateCardSelected]}
                    onPress={() => {
                      const today = new Date();
                      const initialDate = checkIn ? new Date(checkIn) : today;
                      setTempCheckIn(initialDate);
                      setCalendarMonth(initialDate);
                      setShowCheckInPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomBookingDateCardHeader}>
                      <Ionicons name="log-in-outline" size={18} color={checkIn ? "#0a7ea4" : "#94a3b8"} />
                      <ThemedText style={[styles.roomBookingDateLabel, checkIn && styles.roomBookingDateLabelSelected]}>
                        Nhận phòng
                      </ThemedText>
                    </View>
                    {checkIn ? (
                      <View style={styles.roomBookingDateContent}>
                        <ThemedText style={styles.roomBookingDateDay}>{getDateInfo(checkIn)?.day || 0}</ThemedText>
                        <ThemedText style={styles.roomBookingDateMonth}>
                          Tháng {getDateInfo(checkIn)?.month || 0}/{getDateInfo(checkIn)?.year || 0}
                        </ThemedText>
                        <ThemedText style={styles.roomBookingDateDayName}>{getDateInfo(checkIn)?.dayName || ''}</ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={styles.roomBookingDatePlaceholder}>Chọn ngày</ThemedText>
                    )}
                  </TouchableOpacity>

                  <View style={styles.roomBookingDateArrow}>
                    <Ionicons name="arrow-forward" size={20} color="#cbd5e1" />
                    {checkIn && checkOut && (
                      <ThemedText style={styles.roomBookingDateNights}>
                        {Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} đêm
                      </ThemedText>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.roomBookingDateCard,
                      checkOut && styles.roomBookingDateCardSelected,
                      !checkIn && styles.roomBookingDateCardDisabled
                    ]}
                    onPress={() => {
                      if (!checkIn) {
                        Alert.alert('Thông báo', 'Vui lòng chọn ngày nhận phòng trước');
                        return;
                      }
                      const minDate = new Date(checkIn);
                      minDate.setDate(minDate.getDate() + 1);
                      const initialDate = checkOut ? new Date(checkOut) : minDate;
                      setTempCheckOut(initialDate);
                      setCalendarMonth(initialDate);
                      setShowCheckOutPicker(true);
                    }}
                    activeOpacity={0.7}
                    disabled={!checkIn}
                  >
                    <View style={styles.roomBookingDateCardHeader}>
                      <Ionicons name="log-out-outline" size={18} color={checkOut ? "#0a7ea4" : "#94a3b8"} />
                      <ThemedText style={[styles.roomBookingDateLabel, checkOut && styles.roomBookingDateLabelSelected]}>
                        Trả phòng
                      </ThemedText>
                    </View>
                    {checkOut ? (
                      <View style={styles.roomBookingDateContent}>
                        <ThemedText style={styles.roomBookingDateDay}>{getDateInfo(checkOut)?.day || 0}</ThemedText>
                        <ThemedText style={styles.roomBookingDateMonth}>
                          Tháng {getDateInfo(checkOut)?.month || 0}/{getDateInfo(checkOut)?.year || 0}
                        </ThemedText>
                        <ThemedText style={styles.roomBookingDateDayName}>{getDateInfo(checkOut)?.dayName || ''}</ThemedText>
                      </View>
                    ) : (
                      <ThemedText style={styles.roomBookingDatePlaceholder}>Chọn ngày</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Availability Status */}
              {checkIn && checkOut && (
                <View style={styles.roomBookingAvailabilitySection}>
                  {isCheckingAvailability ? (
                    <View style={styles.roomBookingAvailabilityLoading}>
                      <ActivityIndicator size="small" color="#0a7ea4" />
                      <ThemedText style={styles.roomBookingAvailabilityText}>
                        Đang kiểm tra phòng còn trống...
                      </ThemedText>
                    </View>
                  ) : availableRooms.length > 0 ? (
                    <>
                      <View style={styles.roomBookingAvailabilitySuccess}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <View style={styles.roomBookingAvailabilityInfo}>
                          <ThemedText style={styles.roomBookingAvailabilitySuccessText}>
                            Còn {availableRooms.length || 0} phòng trống
                          </ThemedText>
                          <ThemedText style={styles.roomBookingAvailabilitySubtext}>
                            Từ {formatDateFull(checkIn)} đến {formatDateFull(checkOut)}
                          </ThemedText>
                        </View>
                      </View>
                      
                      {/* Room Selection */}
                      <View style={styles.roomSelectionSection}>
                        <ThemedText style={styles.roomSelectionTitle}>Chọn phòng:</ThemedText>
                        <View style={styles.roomSelectionList}>
                          {availableRooms.map((room) => (
                            <TouchableOpacity
                              key={room._id}
                              style={[
                                styles.roomSelectionCard,
                                selectedRoomForBooking === room._id && styles.roomSelectionCardSelected,
                              ]}
                              onPress={() => setSelectedRoomForBooking(room._id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.roomSelectionCardContent}>
                                <View style={styles.roomSelectionCardLeft}>
                                  <View style={styles.roomSelectionIconContainer}>
                                    <Ionicons name="bed" size={20} color="#0a7ea4" />
                                  </View>
                                  <View style={styles.roomSelectionInfo}>
                                    <ThemedText style={styles.roomSelectionName}>{room.name}</ThemedText>
                                    <ThemedText style={styles.roomSelectionType}>
                                      {getRoomTypeLabel(room.type)}
                                    </ThemedText>
                                  </View>
                                </View>
                                <View style={styles.roomSelectionCardRight}>
                                  <ThemedText style={styles.roomSelectionPrice}>
                                    {formatPrice(room.pricePerNight)} VNĐ/đêm
                                  </ThemedText>
                                  {selectedRoomForBooking === room._id && (
                                    <View style={styles.roomSelectionCheckmark}>
                                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                    </View>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.roomBookingAvailabilityError}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                      <View style={styles.roomBookingAvailabilityInfo}>
                        <ThemedText style={styles.roomBookingAvailabilityErrorText}>
                          Không còn phòng trống
                        </ThemedText>
                        <ThemedText style={styles.roomBookingAvailabilitySubtext}>
                          Vui lòng chọn khoảng thời gian khác
                        </ThemedText>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Book Button */}
              {checkIn && checkOut && availableRooms.length > 0 && !isCheckingAvailability && selectedRoomForBooking && (
                <TouchableOpacity
                  style={styles.roomBookingButton}
                  onPress={handleBookRoom}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#0a7ea4', '#0d8bb8']}
                    style={styles.roomBookingButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                    <ThemedText style={styles.roomBookingButtonText}>Đặt phòng ngay</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {checkIn && checkOut && availableRooms.length > 0 && !isCheckingAvailability && !selectedRoomForBooking && (
                <View style={styles.roomBookingHint}>
                  <Ionicons name="information-circle" size={18} color="#f59e0b" />
                  <ThemedText style={styles.roomBookingHintText}>
                    Vui lòng chọn một phòng để tiếp tục
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Check In Date Picker Modal */}
      <Modal
        visible={showCheckInPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCheckInPicker(false)}
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
                const days = getCalendarDays(calendarMonth);
                const firstDay = getFirstDayOfMonth(calendarMonth);
                const daysInMonth = getDaysInMonth(calendarMonth);
                
                return days.map((day, index) => {
                  const isCurrentMonthDay = isCurrentMonth(day, calendarMonth, index);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day || 1);
                  const isPast = date < today;
                  const isSelected = tempCheckIn && 
                    day === tempCheckIn.getDate() &&
                    calendarMonth.getMonth() === tempCheckIn.getMonth() &&
                    calendarMonth.getFullYear() === tempCheckIn.getFullYear();
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !isCurrentMonthDay && styles.calendarDayOtherMonth,
                        isSelected && styles.calendarDaySelected,
                        isPast && styles.calendarDayPast,
                      ]}
                      onPress={() => handleCalendarDateSelect(day, 'checkIn')}
                      disabled={!isCurrentMonthDay || isPast}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.calendarDayText,
                          !isCurrentMonthDay && styles.calendarDayTextOtherMonth,
                          isSelected && styles.calendarDayTextSelected,
                          isPast && styles.calendarDayTextPast,
                        ]}
                      >
                        {day || ''}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
            <TouchableOpacity
              style={styles.calendarConfirmButton}
              onPress={() => setShowCheckInPicker(false)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.calendarConfirmButtonText}>Xác nhận</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check Out Date Picker Modal */}
      <Modal
        visible={showCheckOutPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCheckOutPicker(false)}
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
                const days = getCalendarDays(calendarMonth);
                const firstDay = getFirstDayOfMonth(calendarMonth);
                const daysInMonth = getDaysInMonth(calendarMonth);
                
                return days.map((day, index) => {
                  const isCurrentMonthDay = isCurrentMonth(day, calendarMonth, index);
                  const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day || 1);
                  const checkInDate = checkIn ? new Date(checkIn) : null;
                  const minDate = checkInDate ? new Date(checkInDate) : new Date();
                  minDate.setDate(minDate.getDate() + 1);
                  minDate.setHours(0, 0, 0, 0);
                  const isPast = checkInDate ? date <= checkInDate : date < new Date();
                  const isSelected = tempCheckOut && 
                    day === tempCheckOut.getDate() &&
                    calendarMonth.getMonth() === tempCheckOut.getMonth() &&
                    calendarMonth.getFullYear() === tempCheckOut.getFullYear();
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !isCurrentMonthDay && styles.calendarDayOtherMonth,
                        isSelected && styles.calendarDaySelected,
                        isPast && styles.calendarDayPast,
                      ]}
                      onPress={() => handleCalendarDateSelect(day, 'checkOut')}
                      disabled={!isCurrentMonthDay || isPast}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.calendarDayText,
                          !isCurrentMonthDay && styles.calendarDayTextOtherMonth,
                          isSelected && styles.calendarDayTextSelected,
                          isPast && styles.calendarDayTextPast,
                        ]}
                      >
                        {day || ''}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
            <TouchableOpacity
              style={styles.calendarConfirmButton}
              onPress={() => setShowCheckOutPicker(false)}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.calendarConfirmButtonText}>Xác nhận</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowMapModal(false)}
          />
          <View style={styles.mapModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconContainer}>
                  <Ionicons name="map" size={24} color="#0a7ea4" />
                </View>
                <ThemedText style={styles.modalTitle}>Bản đồ</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowMapModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>
            <View style={styles.mapModalContainer}>
              <WebView
                source={getMapSource(homestay?.googleMapsEmbed || '')}
                style={styles.mapModalWebView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                renderLoading={() => (
                  <View style={styles.mapLoadingContainer}>
                    <ActivityIndicator size="large" color="#0a7ea4" />
                    <ThemedText style={styles.mapLoadingText}>Đang tải bản đồ...</ThemedText>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error: ', nativeEvent);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: '100%',
    height: width * 0.75,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageHeaderOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  imageHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHeaderButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageNavButtonLeft: {
    left: 16,
  },
  imageNavButtonRight: {
    right: 16,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
  },
  imageOverlayContent: {
    gap: 8,
  },
  imageOverlayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  imageOverlayBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageOverlayBadge: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageOverlayBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCardRow: {
    flexDirection: 'row',
    gap: 20,
  },
  ratingSection: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingRight: 16,
  },
  ratingNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0a7ea4',
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  ratingCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  ratingArrow: {
    alignSelf: 'flex-start',
  },
  locationSection: {
    flex: 1.5,
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 4,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  locationDetailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  mapButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mapButtonText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  amenitiesQuickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  amenitiesQuickText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  descriptionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeMoreText: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.3,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  roomsSection: {
    marginTop: 16,
  },
  roomTypesList: {
    gap: 14,
  },
  roomTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roomTypeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  roomTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  roomTypeInfo: {
    flex: 1,
    gap: 6,
  },
  roomTypeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.2,
  },
  roomTypeDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  roomTypeCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#f1f5f9',
  },
  roomTypeStats: {
    flex: 1,
    gap: 8,
  },
  roomTypeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomTypeStatText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  roomTypePriceText: {
    fontSize: 15,
    color: '#0a7ea4',
    fontWeight: '700',
  },
  roomBookingModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
    minHeight: 600,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  roomBookingModalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  roomBookingDateSection: {
    marginBottom: 20,
  },
  roomBookingDateRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  roomBookingDateCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 110,
    justifyContent: 'space-between',
  },
  roomBookingDateCardSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0a7ea4',
  },
  roomBookingDateCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  roomBookingDateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  roomBookingDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  roomBookingDateLabelSelected: {
    color: '#0a7ea4',
  },
  roomBookingDateContent: {
    flex: 1,
    marginTop: 8,
  },
  roomBookingDateDay: {
    fontSize: 28,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 6,
    lineHeight: 32,
  },
  roomBookingDateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  roomBookingDateDayName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  roomBookingDatePlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
  },
  roomBookingDateArrow: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 40,
    paddingTop: 20,
  },
  roomBookingDateNights: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a7ea4',
    marginTop: 4,
    textAlign: 'center',
  },
  roomBookingAvailabilitySection: {
    marginBottom: 20,
  },
  roomBookingAvailabilityLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  roomBookingAvailabilityText: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  roomBookingAvailabilitySuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  roomBookingAvailabilityInfo: {
    flex: 1,
    gap: 4,
  },
  roomBookingAvailabilitySuccessText: {
    fontSize: 15,
    color: '#166534',
    fontWeight: '700',
  },
  roomBookingAvailabilityError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  roomBookingAvailabilityErrorText: {
    fontSize: 15,
    color: '#991b1b',
    fontWeight: '700',
  },
  roomBookingAvailabilitySubtext: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  roomSelectionSection: {
    marginTop: 16,
    gap: 12,
  },
  roomSelectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  roomSelectionList: {
    gap: 12,
  },
  roomSelectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  roomSelectionCardSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  roomSelectionCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  roomSelectionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roomSelectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  roomSelectionInfo: {
    flex: 1,
    gap: 4,
  },
  roomSelectionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  roomSelectionType: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  roomSelectionCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  roomSelectionPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  roomSelectionCheckmark: {
    marginTop: 4,
  },
  roomBookingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 8,
  },
  roomBookingHintText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
  roomBookingButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
  },
  roomBookingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  roomBookingButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  calendarDayPast: {
    opacity: 0.3,
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
  calendarDayTextPast: {
    color: '#94a3b8',
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
  mapPreviewContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  mapPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  mapPreviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  mapPreviewTextContainer: {
    flex: 1,
    gap: 4,
  },
  mapPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  mapPreviewSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  mapModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
  },
  mapModalContainer: {
    width: '100%',
    height: 500,
    backgroundColor: '#f0f0f0',
  },
  mapModalWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  hostText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 550,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalAmenitiesList: {
    gap: 16,
  },
  modalAmenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalAmenityText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});

