import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getReviewImageUrl, getHomestayImageUrl } from '@/services/api';

interface Review {
  _id: string;
  homestay: {
    _id: string;
    name: string;
    address?: any;
    images?: string[];
  };
  booking?: {
    checkIn: string;
    checkOut: string;
    numberOfGuests: number;
  } | null;
  rating: number;
  comment?: string;
  images?: string[];
  hostResponse?: {
    comment: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MyReviewsScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    loadReviews();
  }, [isAuthenticated, user, pagination.page]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const response: any = await apiService.getMyReviews({
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      if (response.success && response.data) {
        setReviews(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.message || 'Không thể tải danh sách đánh giá');
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách đánh giá');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPagination(prev => ({ ...prev, page: 1 }));
    loadReviews();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewHomestay = (homestayId: string) => {
    router.push(`/homestay-detail?id=${homestayId}`);
  };

  if (isLoading && reviews.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Đánh Giá Của Tôi</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a7ea4" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle}>Đánh Giá Của Tôi</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {pagination.total > 0 ? `${pagination.total} đánh giá` : 'Chưa có đánh giá'}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={64} color={isDark ? '#8E8E93' : '#ccc'} />
            <ThemedText style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#999' }]}>
              Bạn chưa có đánh giá nào
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: isDark ? '#8E8E93' : '#999' }]}>
              Hãy đánh giá các homestay bạn đã ở để giúp người khác có trải nghiệm tốt hơn
            </ThemedText>
          </View>
        ) : (
          reviews.map((review) => (
            <View
              key={review._id}
              style={[styles.reviewCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}
            >
              {/* Homestay Info */}
              <TouchableOpacity
                style={styles.homestayHeader}
                onPress={() => handleViewHomestay(review.homestay._id)}
                activeOpacity={0.7}
              >
                {review.homestay.images && review.homestay.images.length > 0 ? (
                  <Image
                    source={{ uri: getHomestayImageUrl(review.homestay.images[0]) || '' }}
                    style={styles.homestayImage}
                  />
                ) : (
                  <View style={[styles.homestayImagePlaceholder, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}>
                    <Ionicons name="home" size={24} color={isDark ? '#8E8E93' : '#999'} />
                  </View>
                )}
                <View style={styles.homestayInfo}>
                  <ThemedText style={[styles.homestayName, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                    {review.homestay?.name || 'N/A'}
                  </ThemedText>
                  {review.booking && (
                    <View style={styles.bookingInfo}>
                      <Ionicons name="calendar-outline" size={12} color={isDark ? '#8E8E93' : '#666'} />
                      <ThemedText style={[styles.bookingDate, { color: isDark ? '#8E8E93' : '#666' }]}>
                        {formatDate(review.booking.checkIn)} - {formatDate(review.booking.checkOut)}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={isDark ? '#8E8E93' : '#999'} />
              </TouchableOpacity>

              {/* Rating */}
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= review.rating ? 'star' : 'star-outline'}
                    size={20}
                    color="#fbbf24"
                  />
                ))}
                <ThemedText style={[styles.ratingText, { color: isDark ? '#8E8E93' : '#666' }]}>
                  {review.rating}/5
                </ThemedText>
              </View>

              {/* Comment */}
              {review.comment && (
                <ThemedText style={[styles.comment, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                  {review.comment}
                </ThemedText>
              )}

              {/* Images */}
              {review.images && review.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
                  {review.images.map((img, index) => (
                    <Image
                      key={index}
                      source={{ uri: getReviewImageUrl(img) || '' }}
                      style={styles.reviewImage}
                    />
                  ))}
                </ScrollView>
              )}

              {/* Host Response */}
              {review.hostResponse ? (
                <View style={[styles.hostResponseBox, { backgroundColor: isDark ? '#2C2C2E' : '#f0f9ff', borderLeftColor: '#0a7ea4' }]}>
                  <View style={styles.hostResponseHeader}>
                    <View style={styles.hostResponseHeaderLeft}>
                      <Ionicons name="chatbubble" size={16} color="#0a7ea4" />
                      <ThemedText style={[styles.hostResponseLabel, { color: '#0a7ea4' }]}>
                        Phản hồi từ chủ nhà:
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.hostResponseDate, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {formatDate(review.hostResponse.respondedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.hostResponseText, { color: isDark ? '#fff' : '#374151' }]}>
                    {review.hostResponse.comment}
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.noResponseBox, { backgroundColor: isDark ? '#2C2C2E' : '#f8fafc' }]}>
                  <Ionicons name="time-outline" size={16} color={isDark ? '#8E8E93' : '#999'} />
                  <ThemedText style={[styles.noResponseText, { color: isDark ? '#8E8E93' : '#999' }]}>
                    Chủ nhà chưa phản hồi
                  </ThemedText>
                </View>
              )}

              {/* Review Date */}
              <View style={styles.reviewFooter}>
                <ThemedText style={[styles.dateText, { color: isDark ? '#8E8E93' : '#999' }]}>
                  Đánh giá ngày {formatDate(review.createdAt)}
                </ThemedText>
              </View>
            </View>
          ))
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  reviewCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  homestayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  homestayImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  homestayImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homestayInfo: {
    flex: 1,
    gap: 4,
  },
  homestayName: {
    fontSize: 16,
    fontWeight: '700',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingDate: {
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  hostResponseBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  hostResponseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hostResponseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostResponseLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  hostResponseDate: {
    fontSize: 11,
  },
  hostResponseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noResponseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  noResponseText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 12,
  },
});
