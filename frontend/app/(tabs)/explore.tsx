import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService, getHomestayImageUrl } from '@/services/api';
import { ROOM_TYPES } from '@/types/homestay';

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
  rooms?: Array<{
    _id: string;
    type: string;
    name: string;
    pricePerNight: number;
    status: string;
  }>;
  amenities?: string[];
}

interface WeatherData {
  current: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    time: string;
  };
  description: {
    icon: string;
    description: string;
    emoji: string;
  };
  locationName?: string;
}

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [loadingWeather, setLoadingWeather] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadHomestays();
  }, []);

  const loadHomestays = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllHomestays({
        limit: 50,
      });
      if (response.success && response.data) {
        setHomestays(response.data);
        // Load thời tiết cho tất cả homestays
        loadWeatherForHomestays(response.data);
      } else {
        throw new Error(response.message || 'Không thể tải danh sách homestay');
      }
    } catch (error: any) {
      console.error('Error loading homestays:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Load thời tiết cho các homestays (song song)
  const loadWeatherForHomestays = async (homestaysList: Homestay[]) => {
    // Chỉ load thời tiết cho 10 homestay đầu tiên để tránh quá tải
    const homestaysToLoad = homestaysList.slice(0, 10);
    
    homestaysToLoad.forEach(async (homestay) => {
      try {
        setLoadingWeather(prev => ({ ...prev, [homestay._id]: true }));
        const response = await apiService.getHomestayWeather(homestay._id);
        if (response.success && response.data) {
          setWeatherData(prev => ({
            ...prev,
            [homestay._id]: response.data
          }));
        }
      } catch (error) {
        console.error(`Error loading weather for homestay ${homestay._id}:`, error);
      } finally {
        setLoadingWeather(prev => ({ ...prev, [homestay._id]: false }));
      }
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHomestays();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Group rooms theo type và tính giá
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

  const filteredHomestays = homestays.filter((homestay) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      homestay.name.toLowerCase().includes(query) ||
      homestay.description.toLowerCase().includes(query) ||
      homestay.address.province.name.toLowerCase().includes(query) ||
      homestay.address.district.name.toLowerCase().includes(query)
    );
  });

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
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="compass" size={28} color="#fff" />
          </View>
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerTitle}>Khám Phá</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Tìm homestay phù hợp với bạn</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search" size={20} color="#0a7ea4" />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm homestay, địa điểm..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />
        }
      >
        {filteredHomestays.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="home-outline" size={72} color="#cbd5e1" />
            </View>
            <ThemedText style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy homestay nào' : 'Chưa có homestay nào'}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Các homestay sẽ hiển thị ở đây'}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.homestaysList}>
            {filteredHomestays.map((homestay) => (
              <TouchableOpacity
                key={homestay._id}
                style={styles.homestayCard}
                onPress={() => router.push(`/homestay-detail?id=${homestay._id}` as any)}
                activeOpacity={0.7}
              >
                {/* Image */}
                {homestay.images && homestay.images.length > 0 && (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: getHomestayImageUrl(homestay.images[0]) || '' }}
                      style={styles.homestayImage}
                      resizeMode="cover"
                    />
                    {homestay.featured && (
                      <LinearGradient
                        colors={['#f59e0b', '#fbbf24']}
                        style={styles.featuredBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="star" size={14} color="#fff" />
                        <ThemedText style={styles.featuredText}>Nổi bật</ThemedText>
                      </LinearGradient>
                    )}
                  </View>
                )}

                {/* Content */}
                <View style={styles.cardContent}>
                  <ThemedText style={styles.homestayName} numberOfLines={1}>
                    {homestay.name}
                  </ThemedText>
                  
                  <View style={styles.locationRow}>
                    <View style={styles.locationIconContainer}>
                      <Ionicons name="location" size={14} color="#0a7ea4" />
                    </View>
                    <ThemedText style={styles.locationText} numberOfLines={1}>
                      {homestay.address.district.name}, {homestay.address.province.name}
                    </ThemedText>
                  </View>

                  {/* Weather Info */}
                  {weatherData[homestay._id] && (
                    <View style={styles.weatherRow}>
                      <View style={styles.weatherIconContainer}>
                        <ThemedText style={styles.weatherEmoji}>
                          {weatherData[homestay._id].description.emoji}
                        </ThemedText>
                      </View>
                      <View style={styles.weatherInfo}>
                        <ThemedText style={styles.weatherTemp}>
                          {Math.round(weatherData[homestay._id].current.temperature)}°C
                        </ThemedText>
                        <ThemedText style={styles.weatherDescription}>
                          {weatherData[homestay._id].description.description}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                  {loadingWeather[homestay._id] && (
                    <View style={styles.weatherRow}>
                      <ActivityIndicator size="small" color="#0a7ea4" />
                      <ThemedText style={styles.weatherLoadingText}>
                        Đang tải thời tiết...
                      </ThemedText>
                    </View>
                  )}

                  {homestay.amenities && homestay.amenities.length > 0 && (
                    <View style={styles.amenitiesRow}>
                      <View style={styles.amenitiesIconContainer}>
                        <Ionicons name="sparkles" size={14} color="#0a7ea4" />
                      </View>
                      <ThemedText style={styles.amenitiesText} numberOfLines={1}>
                        {homestay.amenities.slice(0, 2).join(', ')}
                      </ThemedText>
                    </View>
                  )}

                  {/* Room Types and Prices */}
                  {homestay.rooms && homestay.rooms.length > 0 ? (
                    <View style={styles.roomTypesContainer}>
                      {getRoomTypesWithPrices(homestay).map((roomType) => (
                        <View key={roomType.type} style={styles.roomTypeItem}>
                          <View style={styles.roomTypeItemLeft}>
                            <Ionicons name="bed" size={14} color="#0a7ea4" />
                            <ThemedText style={styles.roomTypeLabel}>
                              {roomType.label}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.roomTypePrice}>
                            {roomType.minPrice === roomType.maxPrice
                              ? `${formatPrice(roomType.minPrice)} VNĐ`
                              : `${formatPrice(roomType.minPrice)} - ${formatPrice(roomType.maxPrice)} VNĐ`}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noRoomsContainer}>
                      <Ionicons name="bed-outline" size={16} color="#94a3b8" />
                      <ThemedText style={styles.noRoomsText}>
                        Chưa có phòng
                      </ThemedText>
                    </View>
                  )}
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
    gap: 16,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  searchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#11181C',
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
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
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  homestaysList: {
    gap: 16,
  },
  homestayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  homestayImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 18,
    gap: 12,
  },
  homestayName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  locationText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    fontWeight: '600',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  weatherIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  weatherEmoji: {
    fontSize: 20,
  },
  weatherInfo: {
    flex: 1,
    gap: 2,
  },
  weatherTemp: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  weatherDescription: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  weatherLoadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 8,
  },
  amenitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  amenitiesIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  amenitiesText: {
    fontSize: 13,
    color: '#0a7ea4',
    flex: 1,
    fontWeight: '600',
  },
  roomTypesContainer: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  roomTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomTypeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  roomTypeLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  roomTypePrice: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '700',
    flexShrink: 0,
  },
  noRoomsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noRoomsText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
