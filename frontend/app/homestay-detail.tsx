import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getHomestayImageUrl, getReviewImageUrl } from '@/services/api';
import { ROOM_TYPES, AMENITIES } from '@/types/homestay';
import { normalizeAmenitiesFromDB } from '@/utils/homestayValidation';
import { ChatModal } from '@/components/ChatModal';
import { AIChatModal } from '@/components/AIChatModal';

const { width, height } = Dimensions.get('window');

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
  const [showChatModal, setShowChatModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [roomsSectionY, setRoomsSectionY] = useState(0);
  const [highlightRooms, setHighlightRooms] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [roomsExpanded, setRoomsExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const floatingButtonAnim = useRef(new Animated.Value(0)).current;
  const imageViewerScrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const roomsExpandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      loadHomestay();
      loadReviews();
      loadWeather();
    }
  }, [id]);

  // Reload weather khi homestay thay đổi
  useEffect(() => {
    if (homestay) {
      loadWeather();
    }
  }, [homestay?._id]);

  // Scroll to correct image when viewer opens
  useEffect(() => {
    if (showImageViewer && imageViewerScrollRef.current) {
      setTimeout(() => {
        imageViewerScrollRef.current?.scrollTo({
          x: viewerImageIndex * (width - 40),
          animated: false,
        });
      }, 100);
    }
  }, [showImageViewer, viewerImageIndex]);

  // Fade in animation when component loads
  useEffect(() => {
    if (homestay) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [homestay]);

  // Rooms expand/collapse animation
  useEffect(() => {
    Animated.timing(roomsExpandAnim, {
      toValue: roomsExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [roomsExpanded]);

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

  const loadReviews = async () => {
    if (!id) return;
    try {
      setIsLoadingReviews(true);
      const response = await apiService.getHomestayReviews(id, {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (response.success && response.data) {
        const reviewsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.reviews || response.data.data || []);
        setReviews(reviewsData);
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      // Không hiển thị alert, chỉ log lỗi
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const loadWeather = async () => {
    if (!id) return;
    try {
      setLoadingWeather(true);
      const response = await apiService.getHomestayWeather(id);
      if (response.success && response.data) {
        setWeatherData(response.data);
      }
    } catch (error: any) {
      console.error('Error loading weather:', error);
      // Không hiển thị alert, chỉ log lỗi
    } finally {
      setLoadingWeather(false);
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

  // Tính hostId để truyền vào ChatModal
  const getHostId = (): string | null => {
    if (!homestay?.host) return null;
    if (typeof homestay.host === 'object') {
      return homestay.host._id || null;
    }
    return homestay.host;
  };

  // Tính toán rating trung bình từ reviews
  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const average = totalRating / reviews.length;
    return { average: Math.round(average * 10) / 10, count: reviews.length };
  };

  const { average: avgRating, count: reviewCount } = calculateAverageRating();

  // Scroll to rooms section with highlight
  const scrollToRooms = () => {
    if (scrollViewRef.current && roomsSectionY > 0) {
      scrollViewRef.current.scrollTo({ y: roomsSectionY - 20, animated: true });
      
      // Trigger highlight animation
      setHighlightRooms(true);
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 300,
          delay: 1500,
          useNativeDriver: false,
        }),
      ]).start(() => setHighlightRooms(false));
    }
  };

  // Handle scroll to show/hide floating button
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const shouldShow = scrollY > 300; // Show after scrolling 300px
    
    if (shouldShow !== showFloatingButton) {
      setShowFloatingButton(shouldShow);
      Animated.timing(floatingButtonAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

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
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero Image with Overlay */}
        {homestay.images && homestay.images.length > 0 && (
          <View style={styles.imageContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setViewerImageIndex(currentImageIndex);
                setShowImageViewer(true);
              }}
            >
              <Image
                source={{ uri: getHomestayImageUrl(homestay.images[currentImageIndex]) || '' }}
                style={styles.mainImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
            
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
                {!isOwner && user && (
                  <TouchableOpacity
                    style={styles.imageHeaderButton}
                    onPress={() => setShowAIChatModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.imageHeaderButtonInner}>
                      <Ionicons name="sparkles" size={22} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
                {!isOwner && user && homestay.host && (
                  <TouchableOpacity
                    style={styles.imageHeaderButton}
                    onPress={() => setShowChatModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.imageHeaderButtonInner}>
                      <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
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
                  {avgRating > 0 && (
                    <View style={styles.imageOverlayRating}>
                      <Ionicons name="star" size={16} color="#fbbf24" />
                      <ThemedText style={styles.imageOverlayRatingText}>
                        {avgRating}/5
                      </ThemedText>
                  </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Rating and Location Card */}
        <Animated.View 
          style={[
            styles.infoCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.infoCardRow}>
            <TouchableOpacity 
              style={styles.ratingSection}
              onPress={() => reviewCount > 0 && setShowReviewsModal(true)}
              activeOpacity={reviewCount > 0 ? 0.7 : 1}
            >
              <ThemedText style={styles.ratingNumber}>
                {avgRating > 0 ? `${avgRating}/5` : 'Chưa có'}
              </ThemedText>
              <ThemedText style={styles.ratingLabel}>
                {avgRating >= 4 ? 'Rất tốt' : avgRating >= 3 ? 'Tốt' : avgRating >= 2 ? 'Trung bình' : avgRating > 0 ? 'Cần cải thiện' : 'Chưa có đánh giá'}
              </ThemedText>
              <ThemedText style={styles.ratingCount}>
                {reviewCount} {reviewCount === 1 ? 'đánh giá' : 'đánh giá'}
              </ThemedText>
              {reviewCount > 0 && (
                <View style={styles.ratingArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
            </View>
              )}
            </TouchableOpacity>
            <View style={styles.locationSection}>
              <ThemedText style={styles.locationText}>
                {homestay.address.district.name}, {homestay.address.province.name}
              </ThemedText>
              {homestay.googleMapsEmbed && (
                <TouchableOpacity 
                  style={styles.mapButton}
                  onPress={() => setShowMapModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <ThemedText style={styles.mapButtonText}>Bản đồ</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Weather Card */}
        {weatherData && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <View style={styles.weatherIconContainer}>
                <ThemedText style={styles.weatherEmoji}>
                  {weatherData.description?.emoji || '🌤️'}
                </ThemedText>
              </View>
              <View style={styles.weatherHeaderInfo}>
                <ThemedText style={styles.weatherCardTitle}>Thời tiết</ThemedText>
                {weatherData.locationName && (
                  <ThemedText style={styles.weatherLocationName}>
                    {weatherData.locationName}
                  </ThemedText>
                )}
              </View>
            </View>
            <View style={styles.weatherCardContent}>
              <View style={styles.weatherMainInfo}>
                <ThemedText style={styles.weatherTemperature}>
                  {Math.round(weatherData.current.temperature)}°
                </ThemedText>
                <ThemedText style={styles.weatherDescription}>
                  {weatherData.description?.description || 'Đang cập nhật'}
                </ThemedText>
              </View>
              <View style={styles.weatherDetails}>
                <View style={styles.weatherDetailItem}>
                  <Ionicons name="water" size={18} color="#0a7ea4" />
                  <View style={styles.weatherDetailInfo}>
                    <ThemedText style={styles.weatherDetailLabel}>Gió</ThemedText>
                    <ThemedText style={styles.weatherDetailValue}>
                      {Math.round(weatherData.current.windspeed)} km/h
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Forecast 7 ngày */}
            {weatherData.forecast && weatherData.forecast.length > 0 && (
              <View style={styles.weatherForecastSection}>
                <View style={styles.weatherForecastHeader}>
                  <Ionicons name="calendar" size={18} color="#0a7ea4" />
                  <ThemedText style={styles.weatherForecastTitle}>
                    Dự báo 7 ngày tới
                  </ThemedText>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.weatherForecastScroll}
                  contentContainerStyle={styles.weatherForecastContent}
                >
                  {weatherData.forecast.map((day: any, index: number) => {
                    const date = new Date(day.date);
                    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                    const dayName = dayNames[date.getDay()];
                    const dayNumber = date.getDate();
                    const month = date.getMonth() + 1;
                    const isToday = index === 0;
                    
                    // Lấy emoji từ weathercode (giống logic trong backend)
                    const getWeatherEmoji = (code: number | null) => {
                      if (code === null || code === undefined) return '🌤️';
                      if (code === 0) return '☀️';
                      if (code >= 1 && code <= 3) return '⛅';
                      if (code === 45 || code === 48) return '🌫️';
                      if (code >= 51 && code <= 55) return '🌦️';
                      if (code >= 56 && code <= 57) return '🌨️';
                      if (code >= 61 && code <= 65) return '🌧️';
                      if (code >= 66 && code <= 67) return '🌨️';
                      if (code >= 71 && code <= 75) return '❄️';
                      if (code === 77) return '❄️';
                      if (code >= 80 && code <= 82) return '⛈️';
                      if (code >= 85 && code <= 86) return '❄️';
                      if (code === 95) return '⛈️';
                      if (code >= 96 && code <= 99) return '⛈️';
                      return '🌤️';
                    };

                    return (
                      <View 
                        key={index} 
                        style={[
                          styles.weatherForecastDay,
                          isToday && styles.weatherForecastDayToday
                        ]}
                      >
                        <ThemedText style={[
                          styles.weatherForecastDayName,
                          isToday && styles.weatherForecastDayNameToday
                        ]}>
                          {isToday ? 'Hôm nay' : dayName}
                        </ThemedText>
                        <ThemedText style={styles.weatherForecastDayDate}>
                          {dayNumber}/{month}
                        </ThemedText>
                        <ThemedText style={styles.weatherForecastEmoji}>
                          {getWeatherEmoji(day.weathercode)}
                        </ThemedText>
                        <View style={styles.weatherForecastTemps}>
                          {day.temperatureMax !== null && (
                            <ThemedText style={styles.weatherForecastTempMax}>
                              {Math.round(day.temperatureMax)}°
                            </ThemedText>
                          )}
                          {day.temperatureMin !== null && (
                            <ThemedText style={styles.weatherForecastTempMin}>
                              {Math.round(day.temperatureMin)}°
                            </ThemedText>
                          )}
                        </View>
                        {day.precipitation > 0 && (
                          <View style={styles.weatherForecastRain}>
                            <Ionicons name="water" size={12} color="#0a7ea4" />
                            <ThemedText style={styles.weatherForecastRainText}>
                              {day.precipitation.toFixed(1)}mm
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}
        {loadingWeather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherLoadingContainer}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <ThemedText style={styles.weatherLoadingText}>
                Đang tải thời tiết...
              </ThemedText>
            </View>
          </View>
        )}

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

        {/* Host Info */}
        {homestay.host && (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <View style={styles.hostHeaderContent}>
                <Ionicons name="person-circle" size={24} color="#0a7ea4" />
                <ThemedText style={styles.descriptionTitle}>Chủ nhà</ThemedText>
              </View>
            </View>
            <View style={styles.hostInfoContent}>
              <View style={styles.hostAvatar}>
                <Ionicons name="person" size={32} color="#0a7ea4" />
              </View>
              <View style={styles.hostDetails}>
                <ThemedText style={styles.hostName}>
                  {typeof homestay.host === 'object' ? homestay.host.username : 'Chủ nhà'}
                </ThemedText>
                <ThemedText style={styles.hostLabel}>Chủ homestay</ThemedText>
              </View>
            </View>
          </View>
        )}

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

        {/* Terms Section */}
        <TouchableOpacity 
          style={styles.descriptionCard}
          onPress={() => setShowTermsModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.descriptionHeader}>
            <View style={styles.termsHeaderLeft}>
              <Ionicons name="document-text" size={24} color="#0a7ea4" />
              <ThemedText style={styles.descriptionTitle}>Điều khoản & Quy định</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
          </View>
        </TouchableOpacity>

        {/* Rooms by Type */}
        {homestay.rooms && homestay.rooms.length > 0 && (
          <Animated.View 
            style={[
              styles.section, 
              styles.roomsSection,
              highlightRooms && {
                backgroundColor: highlightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#fff', '#e0f2fe']
                }),
                shadowColor: '#0a7ea4',
                shadowOpacity: highlightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 0.3]
                }),
              }
            ]}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setRoomsSectionY(layout.y);
            }}
          >
            <TouchableOpacity 
              style={styles.roomsSectionHeader}
              onPress={() => setRoomsExpanded(!roomsExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.roomsSectionTitleContainer}>
                <Ionicons name="bed" size={20} color="#0a7ea4" />
                <View style={styles.roomsSectionTitleWrapper}>
                  <ThemedText style={styles.sectionTitle}>Phòng</ThemedText>
                </View>
                <Ionicons 
                  name={roomsExpanded ? "chevron-down" : "chevron-forward"} 
                  size={20} 
                  color="#0a7ea4" 
                />
              </View>
            </TouchableOpacity>
            <Animated.View
              style={[
                styles.roomTypesList,
                {
                  maxHeight: roomsExpandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 2000],
                  }),
                  opacity: roomsExpandAnim,
                  overflow: 'hidden',
                }
              ]}
            >
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
            </Animated.View>
          </Animated.View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={20} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>Đánh giá ({reviewCount})</ThemedText>
          </View>
          
          {isLoadingReviews ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <ThemedText style={styles.reviewsLoadingText}>Đang tải đánh giá...</ThemedText>
            </View>
          ) : reviews.length > 0 ? (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 5).map((review) => (
                <View key={review._id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="person" size={20} color="#0a7ea4" />
                      </View>
                      <View style={styles.reviewUserDetails}>
                        <ThemedText style={styles.reviewUserName}>
                          {review.user?.username || review.user?.email || 'Người dùng'}
                        </ThemedText>
                        <ThemedText style={styles.reviewDate}>
                          {formatDate(review.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={16}
                          color="#fbbf24"
                        />
                      ))}
                    </View>
                  </View>
                  
                  {review.comment && (
                    <ThemedText style={styles.reviewComment} numberOfLines={3}>
                      {review.comment}
                    </ThemedText>
                  )}
                  
                  {review.images && review.images.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.reviewImages}
                    >
                      {review.images.slice(0, 5).map((img: string, index: number) => {
                        const imageUrl = img.startsWith('http') || img.startsWith('data:image')
                          ? img
                          : getReviewImageUrl(img) || img;
                        return (
                          <Image
                            key={index}
                            source={{ uri: imageUrl }}
                            style={styles.reviewImage}
                            resizeMode="cover"
                          />
                        );
                      })}
                    </ScrollView>
                  )}
                  
                  {review.details && (
                    <View style={styles.reviewDetails}>
                      {review.details.cleanliness && (
                        <View style={styles.reviewDetailItem}>
                          <ThemedText style={styles.reviewDetailLabel}>Vệ sinh:</ThemedText>
                          <View style={styles.reviewDetailStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= review.details.cleanliness ? 'star' : 'star-outline'}
                                size={12}
                                color="#fbbf24"
                              />
                            ))}
                          </View>
                        </View>
                      )}
                      {review.details.location && (
                        <View style={styles.reviewDetailItem}>
                          <ThemedText style={styles.reviewDetailLabel}>Vị trí:</ThemedText>
                          <View style={styles.reviewDetailStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= review.details.location ? 'star' : 'star-outline'}
                                size={12}
                                color="#fbbf24"
                              />
                            ))}
                          </View>
                        </View>
                      )}
                      {review.details.service && (
                        <View style={styles.reviewDetailItem}>
                          <ThemedText style={styles.reviewDetailLabel}>Dịch vụ:</ThemedText>
                          <View style={styles.reviewDetailStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= review.details.service ? 'star' : 'star-outline'}
                                size={12}
                                color="#fbbf24"
                              />
                            ))}
                          </View>
                        </View>
                      )}
                      {review.details.value && (
                        <View style={styles.reviewDetailItem}>
                          <ThemedText style={styles.reviewDetailLabel}>Giá trị:</ThemedText>
                          <View style={styles.reviewDetailStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= review.details.value ? 'star' : 'star-outline'}
                                size={12}
                                color="#fbbf24"
                              />
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
              
              {reviews.length > 5 && (
                <TouchableOpacity style={styles.viewMoreReviews}>
                  <ThemedText style={styles.viewMoreReviewsText}>
                    Xem thêm {reviews.length - 5} đánh giá
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.reviewsEmpty}>
              <Ionicons name="star-outline" size={48} color="#94a3b8" />
              <ThemedText style={styles.reviewsEmptyText}>
                Chưa có đánh giá nào
              </ThemedText>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Floating Book Button */}
      {homestay.rooms && homestay.rooms.length > 0 && (
        <Animated.View
          style={[
            styles.floatingButtonContainer,
            {
              opacity: floatingButtonAnim,
              transform: [
                {
                  translateY: floatingButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={showFloatingButton ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.floatingButton}
            activeOpacity={0.8}
            onPress={scrollToRooms}
          >
            <LinearGradient
              colors={['#0a7ea4', '#0d8bb8']}
              style={styles.floatingButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="bed" size={22} color="#fff" />
              <ThemedText style={styles.floatingButtonText}>Chọn Phòng</ThemedText>
              <Ionicons name="arrow-down" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        )}

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

              {/* AI Itinerary Button */}
              {checkIn && checkOut && (
                <TouchableOpacity
                  style={styles.aiItineraryButton}
                  onPress={() => {
                    setShowRoomBookingModal(false);
                    setShowAIChatModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#a78bfa']}
                    style={styles.aiItineraryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <ThemedText style={styles.aiItineraryButtonText}>
                      Gợi ý lịch trình AI
                    </ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
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

      {/* Reviews Modal */}
      <Modal
        visible={showReviewsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReviewsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowReviewsModal(false)}
          />
          <View style={styles.reviewsModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconContainer}>
                  <Ionicons name="star" size={24} color="#fbbf24" />
                </View>
                <View>
                  <ThemedText style={styles.modalTitle}>Đánh giá</ThemedText>
                  <ThemedText style={styles.modalSubtitle}>
                    {avgRating > 0 ? `${avgRating}/5` : 'Chưa có đánh giá'} • {reviewCount} đánh giá
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowReviewsModal(false)}
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
              {isLoadingReviews ? (
                <View style={styles.reviewsLoading}>
                  <ActivityIndicator size="small" color="#0a7ea4" />
                  <ThemedText style={styles.reviewsLoadingText}>Đang tải đánh giá...</ThemedText>
                </View>
              ) : reviews.length > 0 ? (
                <View style={styles.reviewsList}>
                  {reviews.map((review) => (
                    <View key={review._id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewUserInfo}>
                          <View style={styles.reviewAvatar}>
                            <Ionicons name="person" size={20} color="#0a7ea4" />
                          </View>
                          <View style={styles.reviewUserDetails}>
                            <ThemedText style={styles.reviewUserName}>
                              {review.user?.username || review.user?.email || 'Người dùng'}
                            </ThemedText>
                            <ThemedText style={styles.reviewDate}>
                              {formatDate(review.createdAt)}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.reviewRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= review.rating ? 'star' : 'star-outline'}
                              size={16}
                              color="#fbbf24"
                            />
                          ))}
                        </View>
                      </View>
                      
                      {review.comment && (
                        <ThemedText style={styles.reviewComment}>
                          {review.comment}
                        </ThemedText>
                      )}
                      
                      {review.images && review.images.length > 0 && (
                        <ScrollView 
                          horizontal 
                          showsHorizontalScrollIndicator={false}
                          style={styles.reviewImages}
                        >
                          {review.images.slice(0, 5).map((img: string, index: number) => {
                            const imageUrl = img.startsWith('http') || img.startsWith('data:image')
                              ? img
                              : getReviewImageUrl(img) || img;
                            return (
                              <Image
                                key={index}
                                source={{ uri: imageUrl }}
                                style={styles.reviewImage}
                                resizeMode="cover"
                              />
                            );
                          })}
                        </ScrollView>
                      )}
                      
                      {review.details && (
                        <View style={styles.reviewDetails}>
                          {review.details.cleanliness && (
                            <View style={styles.reviewDetailItem}>
                              <ThemedText style={styles.reviewDetailLabel}>Vệ sinh:</ThemedText>
                              <View style={styles.reviewDetailStars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Ionicons
                                    key={star}
                                    name={star <= review.details.cleanliness ? 'star' : 'star-outline'}
                                    size={12}
                                    color="#fbbf24"
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                          {review.details.location && (
                            <View style={styles.reviewDetailItem}>
                              <ThemedText style={styles.reviewDetailLabel}>Vị trí:</ThemedText>
                              <View style={styles.reviewDetailStars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Ionicons
                                    key={star}
                                    name={star <= review.details.location ? 'star' : 'star-outline'}
                                    size={12}
                                    color="#fbbf24"
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                          {review.details.service && (
                            <View style={styles.reviewDetailItem}>
                              <ThemedText style={styles.reviewDetailLabel}>Dịch vụ:</ThemedText>
                              <View style={styles.reviewDetailStars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Ionicons
                                    key={star}
                                    name={star <= review.details.service ? 'star' : 'star-outline'}
                                    size={12}
                                    color="#fbbf24"
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                          {review.details.value && (
                            <View style={styles.reviewDetailItem}>
                              <ThemedText style={styles.reviewDetailLabel}>Giá trị:</ThemedText>
                              <View style={styles.reviewDetailStars}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Ionicons
                                    key={star}
                                    name={star <= review.details.value ? 'star' : 'star-outline'}
                                    size={12}
                                    color="#fbbf24"
                                  />
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.reviewsEmpty}>
                  <Ionicons name="star-outline" size={48} color="#94a3b8" />
                  <ThemedText style={styles.reviewsEmptyText}>
                    Chưa có đánh giá nào
                  </ThemedText>
                </View>
              )}
            </ScrollView>
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

      {/* Terms Modal */}
      <Modal
        visible={showTermsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTermsModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIconContainer}>
                  <Ionicons name="document-text" size={24} color="#0a7ea4" />
                </View>
                <ThemedText style={styles.modalTitle}>Điều khoản & Quy định</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTermsModal(false)}
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
              {/* Booking Terms */}
              <View style={styles.termsSection}>
                <View style={styles.termsSectionHeader}>
                  <Ionicons name="calendar" size={20} color="#0a7ea4" />
                  <ThemedText style={styles.termsSectionTitle}>Điều khoản đặt phòng</ThemedText>
                </View>
                <View style={styles.termsContent}>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Thời gian nhận phòng: Từ 14:00, trả phòng: Trước 12:00
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Khách cần cung cấp thông tin chính xác khi đặt phòng
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Hủy đặt phòng trước 24 giờ sẽ được hoàn tiền 100%
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Hủy trong vòng 24 giờ sẽ bị phí hủy 50%
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Refund Policy */}
              <View style={styles.termsSection}>
                <View style={styles.termsSectionHeader}>
                  <Ionicons name="cash" size={20} color="#0a7ea4" />
                  <ThemedText style={styles.termsSectionTitle}>Chính sách hoàn tiền</ThemedText>
                </View>
                <View style={styles.termsContent}>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Hoàn tiền 100% nếu hủy trước 24 giờ so với thời gian nhận phòng
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Hoàn tiền 50% nếu hủy trong vòng 24 giờ
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Không hoàn tiền nếu hủy sau thời gian nhận phòng hoặc không đến
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Thời gian xử lý hoàn tiền: 3-5 ngày làm việc
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Usage Guidelines */}
              <View style={styles.termsSection}>
                <View style={styles.termsSectionHeader}>
                  <Ionicons name="information-circle" size={20} color="#0a7ea4" />
                  <ThemedText style={styles.termsSectionTitle}>Cách thức sử dụng homestay</ThemedText>
                </View>
                <View style={styles.termsContent}>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Vui lòng giữ gìn vệ sinh và tài sản của homestay
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Không hút thuốc trong phòng, không tổ chức tiệc tùng ồn ào
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Tuân thủ quy định về số lượng khách và giờ giấc
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Liên hệ chủ nhà nếu có vấn đề hoặc cần hỗ trợ
                    </ThemedText>
                  </View>
                  <View style={styles.termItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <ThemedText style={styles.termText}>
                      Trả phòng đúng giờ và kiểm tra lại tài sản trước khi rời đi
                    </ThemedText>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.imageViewerOverlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageViewer(false)}
            activeOpacity={0.7}
          >
            <View style={styles.imageViewerCloseButtonInner}>
              <Ionicons name="close" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Image Counter */}
          {homestay.images && homestay.images.length > 1 && (
            <View style={styles.imageViewerCounter}>
              <ThemedText style={styles.imageViewerCounterText}>
                {viewerImageIndex + 1}/{homestay.images.length}
              </ThemedText>
            </View>
          )}

          {/* Image Container */}
          <View style={styles.imageViewerContainer}>
            <ScrollView
              ref={imageViewerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / (width - 40));
                setViewerImageIndex(index);
                setCurrentImageIndex(index);
              }}
              contentOffset={{ x: viewerImageIndex * (width - 40), y: 0 }}
            >
              {homestay.images && homestay.images.map((image, index) => (
                <View key={index} style={styles.imageViewerItem}>
                  <Image
                    source={{ uri: getHomestayImageUrl(image) || '' }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Navigation Buttons */}
          {homestay.images && homestay.images.length > 1 && (
            <>
              {viewerImageIndex > 0 && (
                <TouchableOpacity
                  style={[styles.imageViewerNavButton, styles.imageViewerNavButtonLeft]}
                  onPress={() => {
                    const newIndex = viewerImageIndex - 1;
                    setViewerImageIndex(newIndex);
                    setCurrentImageIndex(newIndex);
                    imageViewerScrollRef.current?.scrollTo({
                      x: newIndex * (width - 40),
                      animated: true,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
              )}
              {viewerImageIndex < homestay.images.length - 1 && (
                <TouchableOpacity
                  style={[styles.imageViewerNavButton, styles.imageViewerNavButtonRight]}
                  onPress={() => {
                    const newIndex = viewerImageIndex + 1;
                    setViewerImageIndex(newIndex);
                    setCurrentImageIndex(newIndex);
                    imageViewerScrollRef.current?.scrollTo({
                      x: newIndex * (width - 40),
                      animated: true,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* Chat Modal */}
      {homestay.host && user && !isOwner && getHostId() && (
        <ChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          hostId={getHostId()!}
          hostName={typeof homestay.host === 'object' ? homestay.host.username : 'Chủ nhà'}
          hostAvatar={typeof homestay.host === 'object' ? homestay.host.avatar : undefined}
          homestayId={homestay._id}
          homestayName={homestay.name}
        />
      )}

      {/* AI Chat Modal - Gợi ý lịch trình */}
      {user && !isOwner && (
        <AIChatModal
          visible={showAIChatModal}
          onClose={() => setShowAIChatModal(false)}
          homestayName={homestay.name}
          homestayAddress={
            [
              homestay.address.street,
              homestay.address.ward?.name,
              homestay.address.district?.name,
              homestay.address.province?.name,
            ]
              .filter(Boolean)
              .join(', ')
          }
          homestayId={homestay._id}
          checkIn={checkIn || undefined}
          checkOut={checkOut || undefined}
        />
      )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  imageOverlayRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  imageOverlayRatingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f9ff',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mapButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
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
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  floatingButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 12,
  },
  floatingButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f9ff',
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
  roomsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  roomsSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    gap: 12,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  roomsSectionTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 16,
    paddingTop: 8,
  },
  roomTypeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e0f2fe',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
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
  aiItineraryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
    marginBottom: 8,
  },
  aiItineraryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  aiItineraryButtonText: {
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
  hostHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hostAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostDetails: {
    flex: 1,
    gap: 4,
  },
  hostName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#11181C',
  },
  hostLabel: {
    fontSize: 14,
    color: '#64748b',
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
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  reviewsLoadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewUserDetails: {
    flex: 1,
    gap: 4,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImages: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  reviewDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reviewDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  reviewDetailStars: {
    flexDirection: 'row',
    gap: 2,
  },
  viewMoreReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 8,
    marginTop: 8,
  },
  viewMoreReviewsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  reviewsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  reviewsEmptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  reviewsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
  },
  weatherCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  weatherIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  weatherEmoji: {
    fontSize: 32,
  },
  weatherHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  weatherCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
  },
  weatherLocationName: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  weatherCardContent: {
    gap: 16,
  },
  weatherMainInfo: {
    alignItems: 'center',
    gap: 8,
  },
  weatherTemperature: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0a7ea4',
    lineHeight: 56,
  },
  weatherDescription: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weatherDetailInfo: {
    gap: 4,
  },
  weatherDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  weatherDetailValue: {
    fontSize: 14,
    color: '#11181C',
    fontWeight: '700',
  },
  weatherLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  weatherLoadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  weatherForecastSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  weatherForecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  weatherForecastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  weatherForecastScroll: {
    flexGrow: 0,
  },
  weatherForecastContent: {
    paddingRight: 16,
    gap: 12,
  },
  weatherForecastDay: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  weatherForecastDayToday: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0a7ea4',
    borderWidth: 2,
  },
  weatherForecastDayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  weatherForecastDayNameToday: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
  weatherForecastDayDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  weatherForecastEmoji: {
    fontSize: 28,
    marginVertical: 4,
  },
  weatherForecastTemps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherForecastTempMax: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
  },
  weatherForecastTempMin: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  weatherForecastRain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  weatherForecastRainText: {
    fontSize: 10,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  termsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  termsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  termsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  termsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  termsContent: {
    gap: 12,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imageViewerCloseButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  imageViewerCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  imageViewerContainer: {
    width: width - 40,
    height: height - 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginHorizontal: 20,
    marginVertical: 50,
  },
  imageViewerItem: {
    width: width - 40,
    height: height - 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerNavButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageViewerNavButtonLeft: {
    left: 20,
  },
  imageViewerNavButtonRight: {
    right: 20,
  },
});

