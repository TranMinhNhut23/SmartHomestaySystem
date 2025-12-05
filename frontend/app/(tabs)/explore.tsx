import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
  Text,
  Alert,
  Clipboard,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService, getHomestayImageUrl } from '@/services/api';
import { ROOM_TYPES } from '@/types/homestay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

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
  averageRating?: number;
  reviewCount?: number;
  rooms?: Array<{
    _id: string;
    type: string;
    name: string;
    pricePerNight: number;
    status: string;
  }>;
  amenities?: string[];
}

interface Coupon {
  _id: string;
  name: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrder?: number;
  startDate: string;
  endDate: string;
  status: string;
  appliesTo?: 'all' | 'host';
  hostId?: string;
  usedCount?: number;
  maxUsageTotal?: number;
  isOutOfUsage?: boolean; // Flag từ backend để xác định hết lượt
}

const RECENT_HOMESTAYS_KEY = 'recent_viewed_homestays';
const MAX_RECENT_HOMESTAYS = 10;

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { unreadCount } = useNotifications();
  const { isAuthenticated } = useAuth();
  
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [recentHomestays, setRecentHomestays] = useState<Homestay[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Homestay[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('hotels');
  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false);
  const [bannerImages, setBannerImages] = useState<Array<{ id: string; image: string; title: string; link?: string; order?: number }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; label: string; icon: string; order?: number }>>([]);
  const [saleEvents, setSaleEvents] = useState<Array<{
    id: string;
    name: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    order: number;
  }>>([]);
  
  const countdownIntervalRef = useRef<number | null>(null);
  const adScrollViewRef = useRef<ScrollView>(null);
  const adIntervalRef = useRef<number | null>(null);

  // Lọc banner images và categories chỉ hiển thị những cái active
  // Note: bannerImages và categories đã được load từ API với order và đã được sắp xếp
  const adImages = bannerImages.filter(banner => banner.image && banner.title);
  const displayCategories = categories.filter(cat => cat.id && cat.label && cat.icon);


  useEffect(() => {
    loadData();
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Kiểm tra thông báo chào mừng khi đăng nhập
  useEffect(() => {
    if (isAuthenticated) {
      checkWelcomeNotification();
    }
  }, [isAuthenticated]);

  // Kiểm tra và hiển thị thông báo chào mừng khi mới đăng nhập
  const checkWelcomeNotification = async () => {
    try {
      // Đợi một chút để đảm bảo isAuthenticated đã được cập nhật
      setTimeout(async () => {
        if (!isAuthenticated) {
          return;
        }
        
        const hasSeenWelcome = await AsyncStorage.getItem('has_seen_welcome_notification');
        if (!hasSeenWelcome) {
          // Đợi thêm một chút để trang load xong rồi mới hiển thị
          setTimeout(() => {
            setShowWelcomeNotification(true);
          }, 1500);
        }
      }, 500);
    } catch (error) {
      console.error('Error checking welcome notification:', error);
    }
  };

  const handleCloseWelcomeNotification = async () => {
    try {
      await AsyncStorage.setItem('has_seen_welcome_notification', 'true');
      setShowWelcomeNotification(false);
    } catch (error) {
      console.error('Error saving welcome notification status:', error);
      setShowWelcomeNotification(false);
    }
  };

  useEffect(() => {
    // Cập nhật countdown mỗi giây
    countdownIntervalRef.current = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [coupons]);

  // Auto-scroll quảng cáo mỗi 3 giây
  useEffect(() => {
    if (adImages.length === 0) return;

    adIntervalRef.current = setInterval(() => {
      setCurrentAdIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % adImages.length;
        // Scroll đến ảnh tiếp theo
        if (adScrollViewRef.current) {
          adScrollViewRef.current.scrollTo({
            x: nextIndex * width,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 3000);

    return () => {
      if (adIntervalRef.current) {
        clearInterval(adIntervalRef.current);
      }
    };
  }, [adImages.length]);

  const loadData = async () => {
    // Load homestays trước, sau đó load recent, coupons và system config
    await loadHomestays();
    await Promise.all([
      loadCoupons(),
      loadSystemConfig(),
    ]);
  };

  const loadSystemConfig = async () => {
    try {
      const response = await apiService.getSystemConfig();
      if (response.success && response.data) {
        const config = response.data;
        // Load banner images (chỉ những cái active) và sắp xếp theo order
        const activeBanners = (config.homepage?.bannerImages || [])
          .filter((banner: any) => banner.isActive)
          .map((banner: any) => ({
            id: banner.id,
            image: banner.image,
            title: banner.title,
            link: banner.link,
            order: banner.order || 0,
          }))
          .sort((a: any, b: any) => a.order - b.order);
        setBannerImages(activeBanners);

        // Load categories (chỉ những cái active) và sắp xếp theo order
        const activeCategories = (config.homepage?.categories || [])
          .filter((cat: any) => cat.isActive)
          .map((cat: any) => ({
            id: cat.id,
            label: cat.label,
            icon: cat.icon,
            order: cat.order || 0,
          }))
          .sort((a: any, b: any) => a.order - b.order);
        setCategories(activeCategories);

        // Load sale events (chỉ những cái active và còn trong thời gian hiệu lực) và sắp xếp theo order
        const now = new Date();
        const activeSaleEvents = (config.homepage?.saleEvents || [])
          .filter((event: any) => {
            if (!event.isActive) return false;
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            // Chỉ hiển thị sự kiện đang diễn ra hoặc sắp diễn ra
            return now <= endDate;
          })
          .map((event: any) => ({
            id: event.id,
            name: event.name,
            title: event.title,
            description: event.description || '',
            startDate: event.startDate,
            endDate: event.endDate,
            isActive: event.isActive,
            order: event.order || 0,
          }))
          .sort((a: any, b: any) => a.order - b.order);
        setSaleEvents(activeSaleEvents);
      }
    } catch (error) {
      console.error('Error loading system config:', error);
      // Fallback to default values if API fails
      setBannerImages([
        { id: '1', image: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=800', title: 'Khuyến mãi đặc biệt' },
        { id: '2', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', title: 'Đặt phòng ngay hôm nay' },
        { id: '3', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', title: 'Ưu đãi hấp dẫn' },
      ]);
      setCategories([
        { id: 'sale', label: 'Black Friday Sale', icon: 'flash' },
        { id: 'flights', label: 'Tìm chuyến bay', icon: 'airplane' },
        { id: 'hotels', label: 'Tìm khách sạn', icon: 'bed' },
        { id: 'activities', label: 'Hoạt động du lịch', icon: 'bicycle' },
        { id: 'bus', label: 'Vé xe khách', icon: 'bus' },
      ]);
    }
  };

  const loadHomestays = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllHomestays({
        limit: 50,
      });
      if (response.success && response.data) {
        const homestayList = Array.isArray(response.data) 
          ? response.data 
          : response.data.homestays || response.data;
        setHomestays(homestayList);
        // Load recent homestays sau khi đã có danh sách homestays
        await loadRecentHomestays(homestayList);
      }
    } catch (error: any) {
      console.error('Error loading homestays:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadRecentHomestays = async (homestayList?: Homestay[]) => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_HOMESTAYS_KEY);
      if (stored) {
        const recentIds: string[] = JSON.parse(stored);
        if (recentIds.length > 0) {
          // Load chi tiết các homestay đã xem từ danh sách được truyền vào hoặc từ state
          const listToSearch = homestayList || homestays;
          const recentList = listToSearch.filter(h => recentIds.includes(h._id));
          setRecentHomestays(recentList.slice(0, MAX_RECENT_HOMESTAYS));
        }
      }
    } catch (error) {
      console.error('Error loading recent homestays:', error);
    }
  };

  const saveRecentHomestay = async (homestayId: string) => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_HOMESTAYS_KEY);
      let recentIds: string[] = stored ? JSON.parse(stored) : [];
      
      // Loại bỏ nếu đã có, thêm vào đầu
      recentIds = recentIds.filter(id => id !== homestayId);
      recentIds.unshift(homestayId);
      
      // Giữ tối đa MAX_RECENT_HOMESTAYS
      recentIds = recentIds.slice(0, MAX_RECENT_HOMESTAYS);
      
      await AsyncStorage.setItem(RECENT_HOMESTAYS_KEY, JSON.stringify(recentIds));
      await loadRecentHomestays();
    } catch (error) {
      console.error('Error saving recent homestay:', error);
    }
  };

  const loadCoupons = async () => {
    try {
      console.log('Loading coupons...');
      const response = await apiService.getActiveCoupons();
      console.log('Coupons API response:', response);
      
      if (response.success && response.data) {
        const couponList = Array.isArray(response.data) 
          ? response.data 
          : response.data.coupons || [];
        console.log(`Loaded ${couponList.length} coupons:`, couponList);
        setCoupons(couponList);
        updateCountdowns();
      } else {
        console.warn('No coupons data in response:', response);
        setCoupons([]);
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      setCoupons([]);
    }
  };

  const updateCountdowns = () => {
    const newCountdowns: Record<string, number> = {};
    coupons.forEach(coupon => {
      const now = new Date().getTime();
      const endDate = new Date(coupon.endDate).getTime();
      const remaining = Math.max(0, endDate - now);
      newCountdowns[coupon._id] = remaining;
    });
    setCountdowns(newCountdowns);
  };

  const formatCountdown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const calculateDiscountPrice = (originalPrice: number, coupon?: Coupon) => {
    if (!coupon) return originalPrice;
    
    let discount = 0;
    if (coupon.discountType === 'percent') {
      discount = (originalPrice * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }
    
    return Math.max(0, originalPrice - discount);
  };

  const getBestCoupon = (price: number) => {
    const applicableCoupons = coupons.filter(coupon => {
      if (coupon.status !== 'active') return false;
      if (coupon.minOrder && price < coupon.minOrder) return false;
      const now = new Date();
      const startDate = new Date(coupon.startDate);
      const endDate = new Date(coupon.endDate);
      if (now < startDate || now > endDate) return false;
      return true;
    });

    if (applicableCoupons.length === 0) return null;

    // Tìm coupon giảm nhiều nhất
    let bestCoupon = applicableCoupons[0];
    let maxDiscount = calculateDiscountPrice(price, applicableCoupons[0]);

    applicableCoupons.forEach(coupon => {
      const discountPrice = calculateDiscountPrice(price, coupon);
      if (price - discountPrice > price - maxDiscount) {
        bestCoupon = coupon;
        maxDiscount = discountPrice;
      }
    });

    return bestCoupon;
  };

  const copyCouponCode = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Đã sao chép', `Mã ${code} đã được sao chép vào clipboard`);
  };

  const getRoomTypesWithPrices = (homestay: Homestay) => {
    if (!homestay.rooms || homestay.rooms.length === 0) return [];
    
    const types = new Set(homestay.rooms.map((room) => room.type));
    return Array.from(types).map((type) => {
      const roomTypeInfo = ROOM_TYPES.find((rt) => rt.type === type);
      const roomsOfType = homestay.rooms!.filter((r) => r.type === type);
      const minPrice = Math.min(...roomsOfType.map((r) => r.pricePerNight));
      const maxPrice = Math.max(...roomsOfType.map((r) => r.pricePerNight));
      
      return {
        type,
        label: roomTypeInfo?.label || type,
        minPrice,
        maxPrice,
        count: roomsOfType.length,
      };
    });
  };

  // Hàm tìm kiếm homestay
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const results = homestays.filter((homestay) => {
      return (
        homestay.name.toLowerCase().includes(query) ||
        homestay.description.toLowerCase().includes(query) ||
        homestay.address.province.name.toLowerCase().includes(query) ||
        homestay.address.district.name.toLowerCase().includes(query) ||
        homestay.address.ward.name.toLowerCase().includes(query)
      );
    });
    
    setSearchResults(results);
    setShowSearchResults(true);
  };

  // Sử dụng searchResults nếu đang hiển thị kết quả tìm kiếm, nếu không thì hiển thị tất cả
  const displayedHomestays = showSearchResults ? searchResults : homestays;

  // Kiểm tra coupon có còn hiệu lực không
  const isCouponValid = (coupon: Coupon): boolean => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);
    
    // Kiểm tra thời gian hiệu lực
    if (now < startDate || now > endDate) {
      return false; // Quá hạn hoặc chưa đến ngày bắt đầu
    }
    
    return true; // Còn hạn
  };

  // Kiểm tra coupon có còn lượt sử dụng không
  const isCouponAvailable = (coupon: Coupon): boolean => {
    if (!isCouponValid(coupon)) {
      return false; // Quá hạn
    }
    
    // Kiểm tra số lần sử dụng (nếu có giới hạn)
    if (coupon.maxUsageTotal && coupon.usedCount !== undefined) {
      return coupon.usedCount < coupon.maxUsageTotal;
    }
    
    return true; // Còn lượt hoặc không giới hạn
  };

  // Lọc coupons - hiển thị tất cả coupons active và còn hạn
  const hotelCoupons = coupons.filter(c => {
    // Kiểm tra status
    if (c.status !== 'active') {
      return false;
    }
    // Kiểm tra thời gian hiệu lực
    if (!isCouponValid(c)) {
      return false;
    }
    return true;
  });
  
  // Debug logging
  useEffect(() => {
    if (coupons.length > 0) {
      console.log('Total coupons loaded:', coupons.length);
      console.log('Valid hotel coupons:', hotelCoupons.length);
      console.log('Coupons details:', coupons.map(c => ({
        code: c.code,
        status: c.status,
        appliesTo: c.appliesTo,
        isValid: isCouponValid(c),
        startDate: c.startDate,
        endDate: c.endDate
      })));
    }
  }, [coupons, hotelCoupons.length]);

  const handleHomestayPress = async (homestay: Homestay) => {
    await saveRecentHomestay(homestay._id);
    router.push(`/homestay-detail?id=${homestay._id}` as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      {/* Header với thanh tìm kiếm */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
        <View style={styles.searchBarContainer}>
          <View style={[
            styles.searchBar, 
            { 
              backgroundColor: isDark ? '#374151' : '#f8fafc',
              borderColor: isDark ? '#4b5563' : '#e2e8f0',
            }
          ]}>
            <TouchableOpacity onPress={handleSearch} style={styles.searchIconButton}>
              <Ionicons name="search" size={20} color="#0a7ea4" />
            </TouchableOpacity>
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#fff' : '#11181C' }]}
              placeholder="Đặt vé máy bay nhận mã"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                // Nếu xóa hết text thì ẩn kết quả tìm kiếm
                if (!text.trim()) {
                  setShowSearchResults(false);
                  setSearchResults([]);
                }
              }}
              onSubmitEditing={handleSearch}
              numberOfLines={1}
            />
          </View>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/(tabs)/notifications' as any)}
          >
            <View style={styles.iconButtonInner}>
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {displayCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                selectedCategory === cat.id && styles.categoryTabActive,
                { backgroundColor: isDark ? '#374151' : '#fff' },
                selectedCategory === cat.id && { backgroundColor: '#0a7ea4' }
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={selectedCategory === cat.id ? '#fff' : (isDark ? '#9ca3af' : '#64748b')} 
              />
              <Text style={[
                styles.categoryText,
                { color: selectedCategory === cat.id ? '#fff' : (isDark ? '#9ca3af' : '#64748b') }
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Carousel Quảng Cáo */}
      {adImages.length > 0 && (
        <View style={styles.adCarouselContainer}>
          <ScrollView
            ref={adScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentAdIndex(newIndex);
            }}
            style={styles.adScrollView}
          >
            {adImages.map((ad, index) => (
              <TouchableOpacity
                key={ad.id}
                style={styles.adSlide}
                activeOpacity={0.9}
                onPress={() => {
                  if (ad.link) {
                    // Có thể mở link nếu cần
                    console.log('Banner link:', ad.link);
                  }
                }}
              >
                <Image
                  source={{ uri: ad.image }}
                  style={styles.adImage}
                  resizeMode="cover"
                />
                <View style={styles.adOverlay}>
                  <Text style={styles.adTitle}>{ad.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Dots indicator */}
          <View style={styles.adDotsContainer}>
            {adImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.adDot,
                  currentAdIndex === index && styles.adDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />
        }
      >
        {/* Hoạt động gần đây */}
        {recentHomestays.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Hoạt động gần đây của bạn</ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {recentHomestays.map((homestay) => {
                const minPrice = homestay.rooms && homestay.rooms.length > 0
                  ? Math.min(...homestay.rooms.map(r => r.pricePerNight))
                  : homestay.pricePerNight || 0;
                const bestCoupon = getBestCoupon(minPrice);
                const discountPrice = calculateDiscountPrice(minPrice, bestCoupon || undefined);
                const discountPercent = bestCoupon && minPrice > 0 
                  ? Math.round(((minPrice - discountPrice) / minPrice) * 100)
                  : 0;

                return (
                  <TouchableOpacity
                    key={homestay._id}
                    style={styles.recentCard}
                    onPress={() => handleHomestayPress(homestay)}
                  >
                    {homestay.images && homestay.images.length > 0 && (
                      <View style={styles.recentImageContainer}>
                        <Image
                          source={{ uri: getHomestayImageUrl(homestay.images[0]) || '' }}
                          style={styles.recentImage}
                          resizeMode="cover"
                        />
                        <View style={styles.locationBadge}>
                          <Ionicons name="location" size={12} color="#fff" />
                          <Text style={styles.locationBadgeText} numberOfLines={1}>
                            {homestay.address.ward.name}
                          </Text>
                        </View>
                        {discountPercent > 0 && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>Tiết kiệm {discountPercent}%</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.recentCardContent}>
                      <ThemedText style={styles.recentCardTitle} numberOfLines={1}>
                        {homestay.name}
                      </ThemedText>
                      {/* Số sao riêng */}
                      <View style={styles.starsContainer}>
                        <View style={styles.stars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= (homestay.averageRating || 0) ? 'star' : 'star-outline'}
                              size={12}
                              color="#fbbf24"
                            />
                          ))}
                        </View>
                      </View>
                      {/* Bình luận riêng */}
                      <ThemedText style={styles.reviewText}>
                        {homestay.averageRating?.toFixed(1) || '0.0'}/10 • {homestay.reviewCount || 0} đánh giá
                      </ThemedText>
                      <View style={styles.priceRow}>
                        {bestCoupon && minPrice !== discountPrice && (
                          <ThemedText style={styles.originalPrice}>
                            {formatPrice(minPrice)} VND
                          </ThemedText>
                        )}
                        <ThemedText style={styles.discountPrice}>
                          {formatPrice(discountPrice)} VND
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.priceNote}>Chưa bao gồm thuế và phí</ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Mã giảm Flash Sale - Chỉ hiển thị khách sạn */}
        {hotelCoupons.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <LinearGradient
                  colors={['#0a7ea4', '#10b981']}
                  style={styles.sectionTitleBadge}
                >
                  <Ionicons name="flash" size={18} color="#fff" />
                </LinearGradient>
                <ThemedText style={styles.sectionTitle}>
                  {saleEvents.length > 0 ? saleEvents[0].title : 'Mã giảm Flash Sale'}
                </ThemedText>
              </View>
            </View>
            
            {/* Sale Event Description */}
            {saleEvents.length > 0 && saleEvents[0].description && (
              <ThemedText style={styles.saleEventDescription}>
                {saleEvents[0].description}
              </ThemedText>
            )}
            
            {/* Countdown - Sử dụng endDate từ sale event hoặc coupon đầu tiên */}
            {hotelCoupons.length > 0 && (
              <View style={styles.countdownContainer}>
                <LinearGradient
                  colors={['#fef2f2', '#fee2e2']}
                  style={styles.countdownGradient}
                >
                  <Ionicons name="time-outline" size={18} color="#ef4444" />
                  <Text style={styles.countdownText}>
                    {saleEvents.length > 0 
                      ? `${saleEvents[0].name || 'Flash Sale'} kết thúc sau`
                      : 'Flash Sale kết thúc sau'}
                  </Text>
                  <View style={styles.countdownTime}>
                    <Text style={styles.countdownTimeText}>
                      {saleEvents.length > 0
                        ? (() => {
                            const now = new Date().getTime();
                            const endDate = new Date(saleEvents[0].endDate).getTime();
                            const remaining = Math.max(0, endDate - now);
                            return formatCountdown(remaining);
                          })()
                        : formatCountdown(countdowns[hotelCoupons[0]._id] || 0)}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Coupon Cards - Chỉ hiển thị khách sạn */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.couponsScroll}
              contentContainerStyle={styles.couponsScrollContent}
            >
              {hotelCoupons.slice(0, 10).map((coupon) => {
                const discountText = coupon.discountType === 'percent'
                  ? `Giảm ${coupon.discountValue}%`
                  : `Giảm ${formatPrice(coupon.discountValue)}đ`;
                const isAvailable = isCouponAvailable(coupon);
                
                return (
                  <View key={coupon._id} style={styles.couponCard}>
                    <LinearGradient
                      colors={isAvailable ? ['#0a7ea4', '#10b981'] : ['#94a3b8', '#64748b']}
                      style={styles.couponCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.couponCardContent}>
                        <View style={styles.couponCardTop}>
                          <View style={styles.couponIconContainer}>
                            <Ionicons name="pricetag" size={22} color="#fff" />
                          </View>
                          <View style={styles.couponInfoContainer}>
                            <Text style={styles.couponName} numberOfLines={2}>
                              {coupon.name}
                            </Text>
                            <Text style={styles.couponDiscount}>
                              {discountText}
                              {coupon.maxDiscount && coupon.discountType === 'percent' && (
                                <Text style={styles.couponMaxDiscount}>
                                  {' '}(Tối đa {formatPrice(coupon.maxDiscount)}đ)
                                </Text>
                              )}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.couponCodeSection}>
                          <View style={styles.couponCodeBox}>
                            <Text style={styles.couponCodeText}>{coupon.code}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.copyButtonNew, !isAvailable && styles.copyButtonDisabled]}
                            onPress={() => {
                              if (isAvailable) {
                                copyCouponCode(coupon.code);
                              }
                            }}
                            disabled={!isAvailable}
                          >
                            <Ionicons name="copy-outline" size={16} color="#fff" />
                            <Text style={styles.copyButtonTextNew}>COPY</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {coupon.minOrder && (
                          <Text style={styles.couponMinOrder}>
                            Áp dụng cho đơn từ {formatPrice(coupon.minOrder)}đ
                          </Text>
                        )}
                        
                        {!isAvailable && (
                          <View style={styles.couponDisabledBadge}>
                            <Ionicons name="close-circle" size={14} color="#fff" />
                            <Text style={styles.couponDisabledText}>Đã hết lượt</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}
            </ScrollView>
            
            {hotelCoupons.length > 10 && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={() => setShowCouponModal(true)}
              >
                <LinearGradient
                  colors={['#f97316', '#ea580c']}
                  style={styles.viewMoreGradient}
                >
                  <Text style={styles.viewMoreText}>
                    Xem thêm {hotelCoupons.length - 10} mã khuyến mãi khác
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Danh sách Homestay */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {showSearchResults ? `Kết quả tìm kiếm (${searchResults.length})` : 'Khám phá homestay'}
          </ThemedText>
          {displayedHomestays.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={72} color="#cbd5e1" />
              <ThemedText style={styles.emptyText}>
                {showSearchResults ? 'Không tìm thấy homestay nào' : 'Chưa có homestay nào'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.homestaysGrid}>
              {displayedHomestays.map((homestay) => {
                const minPrice = homestay.rooms && homestay.rooms.length > 0
                  ? Math.min(...homestay.rooms.map(r => r.pricePerNight))
                  : homestay.pricePerNight || 0;
                const bestCoupon = getBestCoupon(minPrice);
                const discountPrice = calculateDiscountPrice(minPrice, bestCoupon || undefined);
                const discountPercent = bestCoupon && minPrice > 0 
                  ? Math.round(((minPrice - discountPrice) / minPrice) * 100)
                  : 0;

                return (
                  <TouchableOpacity
                    key={homestay._id}
                    style={styles.homestayCard}
                    onPress={() => handleHomestayPress(homestay)}
                    activeOpacity={0.8}
                  >
                    {homestay.images && homestay.images.length > 0 && (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: getHomestayImageUrl(homestay.images[0]) || '' }}
                          style={styles.homestayImage}
                          resizeMode="cover"
                        />
                        <View style={styles.locationBadge}>
                          <Ionicons name="location" size={12} color="#fff" />
                          <Text style={styles.locationBadgeText} numberOfLines={1}>
                            {homestay.address.ward.name}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.saveButton}>
                          <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                        {discountPercent > 0 && (
                          <View style={styles.discountBadgeLarge}>
                            <Text style={styles.discountBadgeLargeText}>
                              {discountPercent > 0 ? `Tiết kiệm ${discountPercent}%` : 'SĂN CÒN'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.cardContent}>
                      <ThemedText style={styles.homestayName} numberOfLines={1}>
                        {homestay.name}
                      </ThemedText>
                      
                      {/* Số sao riêng */}
                      <View style={styles.starsContainer}>
                        <View style={styles.stars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= (homestay.averageRating || 0) ? 'star' : 'star-outline'}
                              size={14}
                              color="#fbbf24"
                            />
                          ))}
                        </View>
                      </View>
                      {/* Bình luận riêng */}
                      <ThemedText style={styles.reviewText}>
                        {homestay.averageRating?.toFixed(1) || '0.0'}/10 • {homestay.reviewCount || 0} đánh giá
                      </ThemedText>

                      <View style={styles.priceRow}>
                        {bestCoupon && minPrice !== discountPrice && (
                          <ThemedText style={styles.originalPrice}>
                            {formatPrice(minPrice)} VND
                          </ThemedText>
                        )}
                        <ThemedText style={styles.discountPrice}>
                          {formatPrice(discountPrice)} VND
                        </ThemedText>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Mã Khuyến Mãi */}
      <Modal
        visible={showCouponModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCouponModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCouponModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Mã Khuyến Mãi Khả Dụng</ThemedText>
              <TouchableOpacity
                onPress={() => setShowCouponModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={isDark ? '#9ca3af' : '#64748b'} />
              </TouchableOpacity>
            </View>

            {/* Coupon List */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {hotelCoupons.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="pricetag-outline" size={64} color="#cbd5e1" />
                  <ThemedText style={styles.modalEmptyText}>
                    Hiện tại không có mã khuyến mãi nào
                  </ThemedText>
                </View>
              ) : (
                hotelCoupons.map((coupon) => {
                  const discountText = coupon.discountType === 'percent'
                    ? `Giảm ${coupon.discountValue}%`
                    : `Giảm ${formatPrice(coupon.discountValue)}đ`;

                  const isAvailable = isCouponAvailable(coupon);
                  const isDisabled = !isAvailable;

                  return (
                    <View
                      key={coupon._id}
                      style={[
                        styles.modalCouponCard,
                        { backgroundColor: isDark ? '#374151' : '#f8fafc' },
                        isDisabled && styles.modalCouponCardDisabled,
                      ]}
                    >
                      {isDisabled && (
                        <View style={styles.modalCouponDisabledOverlay}>
                          <View style={styles.modalCouponDisabledBadge}>
                            <Ionicons name="close-circle" size={16} color="#fff" />
                            <Text style={styles.modalCouponDisabledText}>Đã hết lượt</Text>
                          </View>
                        </View>
                      )}

                      <View style={[styles.modalCouponHeader, isDisabled && styles.modalCouponContentDisabled]}>
                        <LinearGradient
                          colors={isDisabled ? ['#94a3b8', '#64748b'] : ['#0a7ea4', '#10b981']}
                          style={styles.modalCouponIcon}
                        >
                          <Ionicons name="pricetag" size={24} color="#fff" />
                        </LinearGradient>
                        <View style={styles.modalCouponInfo}>
                          <ThemedText style={[styles.modalCouponName, isDisabled && styles.modalCouponTextDisabled]}>
                            {coupon.name}
                          </ThemedText>
                          <ThemedText style={[styles.modalCouponDiscount, isDisabled && styles.modalCouponTextDisabled]}>
                            {discountText}
                            {coupon.maxDiscount && coupon.discountType === 'percent' && (
                              <Text> (Tối đa {formatPrice(coupon.maxDiscount)}đ)</Text>
                            )}
                          </ThemedText>
                          {coupon.minOrder && (
                            <ThemedText style={[styles.modalCouponCondition, isDisabled && styles.modalCouponTextDisabled]}>
                              Áp dụng cho đơn từ {formatPrice(coupon.minOrder)}đ
                            </ThemedText>
                          )}
                        </View>
                      </View>

                      <View style={styles.modalCouponCodeContainer}>
                        <View style={[styles.modalCouponCodeBox, isDisabled && styles.modalCouponCodeBoxDisabled]}>
                          <Text style={[styles.modalCouponCode, isDisabled && styles.modalCouponCodeDisabled]}>
                            {coupon.code}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.modalCopyButton, isDisabled && styles.modalCopyButtonDisabled]}
                          onPress={() => {
                            if (!isDisabled) {
                              copyCouponCode(coupon.code);
                            }
                          }}
                          disabled={isDisabled}
                        >
                          <Ionicons name="copy-outline" size={18} color="#fff" />
                          <Text style={styles.modalCopyButtonText}>COPY</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.modalCouponFooter}>
                        <Ionicons name="time-outline" size={14} color={isDisabled ? '#cbd5e1' : '#94a3b8'} />
                        <ThemedText style={[styles.modalCouponExpiry, isDisabled && styles.modalCouponTextDisabled]}>
                          Có hiệu lực đến {new Date(coupon.endDate).toLocaleDateString('vi-VN')}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal Thông Báo Chào Mừng */}
      <Modal
        visible={showWelcomeNotification}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseWelcomeNotification}
      >
        <TouchableOpacity
          style={styles.welcomeModalOverlay}
          activeOpacity={1}
          onPress={handleCloseWelcomeNotification}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.welcomeModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.welcomeCloseButton}
              onPress={handleCloseWelcomeNotification}
            >
              <Ionicons name="close-circle" size={28} color="#94a3b8" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600' }}
              style={styles.welcomeImage}
              resizeMode="cover"
            />
            
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeIconContainer}>
                <LinearGradient
                  colors={['#0a7ea4', '#10b981']}
                  style={styles.welcomeIconGradient}
                >
                  <Ionicons name="checkmark-circle" size={32} color="#fff" />
                </LinearGradient>
              </View>
              
              <Text style={styles.welcomeTitle}>Chào mừng bạn!</Text>
              <Text style={styles.welcomeMessage}>
                Cảm ơn bạn đã tham gia cùng chúng tôi. Khám phá ngay những homestay tuyệt vời và ưu đãi hấp dẫn!
              </Text>
              
              <TouchableOpacity
                style={styles.welcomeButton}
                onPress={handleCloseWelcomeNotification}
              >
                <LinearGradient
                  colors={['#0a7ea4', '#10b981']}
                  style={styles.welcomeButtonGradient}
                >
                  <Text style={styles.welcomeButtonText}>Bắt đầu khám phá</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  searchIconButton: {
    marginRight: 4,
    padding: 4,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  iconButtonInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  categoriesContainer: {
    marginTop: 8,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 16,
  },
  adCarouselContainer: {
    marginBottom: 16,
  },
  adScrollView: {
    height: 180,
  },
  adSlide: {
    width: width,
    height: 180,
    position: 'relative',
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  adTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  adDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  adDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  adDotActive: {
    width: 24,
    backgroundColor: '#0a7ea4',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryTabActive: {
    borderColor: '#0a7ea4',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  saleEventDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  recentCard: {
    width: width * 0.75,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recentImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  recentImage: {
    width: '100%',
    height: '100%',
  },
  locationBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  locationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  recentCardContent: {
    padding: 12,
  },
  recentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 6,
  },
  starsContainer: {
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  priceNote: {
    fontSize: 11,
    color: '#94a3b8',
  },
  countdownContainer: {
    marginBottom: 16,
  },
  countdownGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  countdownTime: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countdownTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  couponsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  couponsScrollContent: {
    paddingRight: 16,
  },
  couponCard: {
    width: width * 0.75,
    marginRight: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  couponCardGradient: {
    borderRadius: 14,
    padding: 0,
  },
  couponCardContent: {
    padding: 14,
  },
  couponCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  couponIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponInfoContainer: {
    flex: 1,
  },
  couponName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    lineHeight: 20,
  },
  couponDiscount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.95,
  },
  couponMaxDiscount: {
    fontSize: 11,
    opacity: 0.8,
  },
  couponCodeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  couponCodeBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  couponCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  copyButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  copyButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    opacity: 0.6,
  },
  copyButtonTextNew: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  couponMinOrder: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.85,
    fontStyle: 'italic',
  },
  couponDisabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  couponDisabledText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  couponCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  couponInfo: {
    flex: 1,
  },
  couponDescription: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 18,
  },
  couponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
    fontFamily: 'monospace',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  viewMoreButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewMoreGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  homestaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  homestayCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  homestayImage: {
    width: '100%',
    height: '100%',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadgeLarge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeLargeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    padding: 12,
  },
  homestayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '600',
  },
  modalCouponCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalCouponHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  modalCouponIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCouponInfo: {
    flex: 1,
  },
  modalCouponName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 4,
  },
  modalCouponDiscount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
    marginBottom: 4,
  },
  modalCouponCondition: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  modalCouponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  modalCouponCodeBox: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  modalCouponCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  modalCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  modalCopyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCouponFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCouponExpiry: {
    fontSize: 12,
    color: '#64748b',
  },
  modalCouponCardDisabled: {
    opacity: 0.5,
    position: 'relative',
  },
  modalCouponDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCouponDisabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modalCouponDisabledText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCouponContentDisabled: {
    opacity: 0.6,
  },
  modalCouponTextDisabled: {
    color: '#94a3b8',
  },
  modalCouponCodeBoxDisabled: {
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
  },
  modalCouponCodeDisabled: {
    color: '#9ca3af',
  },
  modalCopyButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  // Welcome Notification Modal Styles
  welcomeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  welcomeImage: {
    width: '100%',
    height: 200,
  },
  welcomeContent: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeIconContainer: {
    marginBottom: 16,
  },
  welcomeIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  welcomeButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  welcomeButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
