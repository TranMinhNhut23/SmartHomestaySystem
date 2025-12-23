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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getAvatarUrl, getReviewImageUrl } from '@/services/api';

interface Review {
  _id: string;
  guest: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  homestay: {
    _id: string;
    name: string;
    address?: any;
  };
  booking: {
    checkIn: string;
    checkOut: string;
    numberOfGuests: number;
  };
  rating: number;
  comment: string;
  images: string[];
  hostResponse?: {
    comment: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function HostReviewsScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterHasResponse, setFilterHasResponse] = useState<boolean | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
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

    if (user?.roleName !== 'host') {
      Alert.alert('Không có quyền', 'Chỉ host mới có thể truy cập màn hình này', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    loadReviews();
  }, [isAuthenticated, user, filterHasResponse, filterRating, pagination.page]);

  const loadReviews = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHostReviews({
        page: pagination.page,
        limit: pagination.limit,
        hasResponse: filterHasResponse,
        rating: filterRating || undefined,
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

  const handleSubmitResponse = async () => {
    if (!selectedReview) return;

    if (!responseText.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      setProcessingId(selectedReview._id);
      const response = await apiService.addHostResponse(
        selectedReview._id,
        responseText.trim()
      );

      if (response.success) {
        Alert.alert(
          'Thành công',
          'Phản hồi đã được gửi thành công',
          [{ text: 'OK', onPress: () => {
            setShowResponseModal(false);
            setResponseText('');
            setSelectedReview(null);
            loadReviews();
          }}]
        );
      } else {
        throw new Error(response.message || 'Không thể gửi phản hồi');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi phản hồi');
    } finally {
      setProcessingId(null);
    }
  };

  const openResponseModal = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.hostResponse?.comment || '');
    setShowResponseModal(true);
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

  if (isLoading && reviews.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Đánh Giá Homestay</ThemedText>
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
          <ThemedText style={styles.headerTitle}>Đánh Giá Homestay</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {pagination.total > 0 ? `${pagination.total} đánh giá` : 'Chưa có đánh giá'}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterHasResponse === null && styles.filterTabActive,
            {
              backgroundColor:
                filterHasResponse === null
                  ? '#0a7ea4'
                  : isDark
                  ? '#2C2C2E'
                  : '#f0f0f0',
              borderColor:
                filterHasResponse === null
                  ? '#0a7ea4'
                  : isDark
                  ? '#2C2C2E'
                  : '#e5e7eb',
            },
          ]}
          onPress={() => setFilterHasResponse(null)}
        >
          <ThemedText
            style={[
              styles.filterText,
              {
                color:
                  filterHasResponse === null
                    ? '#fff'
                    : isDark
                    ? '#fff'
                    : '#555',
                fontWeight: filterHasResponse === null ? '700' : '600',
              },
            ]}
            numberOfLines={2}
          >
            Tất Cả
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterHasResponse === false && styles.filterTabActive,
            {
              backgroundColor:
                filterHasResponse === false
                  ? '#0a7ea4'
                  : isDark
                  ? '#2C2C2E'
                  : '#f0f0f0',
              borderColor:
                filterHasResponse === false
                  ? '#0a7ea4'
                  : isDark
                  ? '#2C2C2E'
                  : '#e5e7eb',
            },
          ]}
          onPress={() => setFilterHasResponse(false)}
        >
          <ThemedText
            style={[
              styles.filterText,
              {
                color:
                  filterHasResponse === false
                    ? '#fff'
                    : isDark
                    ? '#fff'
                    : '#555',
                fontWeight: filterHasResponse === false ? '700' : '600',
              },
            ]}
            numberOfLines={2}
          >
            Chưa Trả Lời
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterHasResponse === true && styles.filterTabActive,
            {
              backgroundColor:
                filterHasResponse === true
                  ? '#0a7ea4'
                  : isDark
                  ? '#2C2C2E'
                  : '#f0f0f0',
              borderColor:
                filterHasResponse === true
                  ? '#0a7ea4'
                  : isDark
                  ? '#2C2C2E'
                  : '#e5e7eb',
            },
          ]}
          onPress={() => setFilterHasResponse(true)}
        >
          <ThemedText
            style={[
              styles.filterText,
              {
                color:
                  filterHasResponse === true
                    ? '#fff'
                    : isDark
                    ? '#fff'
                    : '#555',
                fontWeight: filterHasResponse === true ? '700' : '600',
              },
            ]}
            numberOfLines={2}
          >
            Đã Trả Lời
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {reviews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={64} color={isDark ? '#8E8E93' : '#ccc'} />
            <ThemedText style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#999' }]}>
              Không có đánh giá nào
            </ThemedText>
          </View>
        ) : (
          reviews.map((review) => (
            <View
              key={review._id}
              style={[styles.reviewCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.userInfo}>
                  {review.guest?.avatar ? (
                    <Image
                      source={{ uri: getAvatarUrl(review.guest.avatar) || '' }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}>
                      <Ionicons name="person" size={24} color={isDark ? '#8E8E93' : '#999'} />
                    </View>
                  )}
                  <View style={styles.userInfoText}>
                    <ThemedText style={[styles.username, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                      {review.guest?.username || review.guest?.email || 'N/A'}
                    </ThemedText>
                    <ThemedText style={[styles.homestayName, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {review.homestay?.name || 'N/A'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.ratingContainer}>
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

              <ThemedText style={[styles.comment, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                {review.comment}
              </ThemedText>

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

              {review.hostResponse ? (
                <View style={[styles.hostResponseBox, { backgroundColor: isDark ? '#2C2C2E' : '#f0f9ff', borderLeftColor: '#0a7ea4' }]}>
                  <View style={styles.hostResponseHeader}>
                    <ThemedText style={[styles.hostResponseLabel, { color: '#0a7ea4' }]}>
                      Phản hồi của bạn:
                    </ThemedText>
                    <ThemedText style={[styles.hostResponseDate, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {formatDate(review.hostResponse.respondedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.hostResponseText, { color: isDark ? '#fff' : '#374151' }]}>
                    {review.hostResponse.comment}
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openResponseModal(review)}
                  >
                    <Ionicons name="pencil" size={16} color="#0a7ea4" />
                    <ThemedText style={[styles.editButtonText, { color: '#0a7ea4' }]}>
                      Chỉnh sửa
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => openResponseModal(review)}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                  <ThemedText style={styles.replyButtonText}>Trả Lời Đánh Giá</ThemedText>
                </TouchableOpacity>
              )}

              <View style={styles.reviewFooter}>
                <ThemedText style={[styles.dateText, { color: isDark ? '#8E8E93' : '#999' }]}>
                  {formatDate(review.createdAt)}
                </ThemedText>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowResponseModal(false);
          setResponseText('');
          setSelectedReview(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
            {selectedReview && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText style={[styles.modalTitle, { color: isDark ? '#fff' : '#111' }]}>
                      Phản Hồi Đánh Giá
                    </ThemedText>
                    <ThemedText style={[styles.modalSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {selectedReview.guest?.username || selectedReview.guest?.email}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                      setSelectedReview(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color={isDark ? '#8E8E93' : '#666'} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={[styles.reviewDetailBox, { backgroundColor: isDark ? '#2C2C2E' : '#f8fafc' }]}>
                    <View style={styles.reviewDetailHeader}>
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= selectedReview.rating ? 'star' : 'star-outline'}
                            size={20}
                            color="#fbbf24"
                          />
                        ))}
                      </View>
                      <ThemedText style={[styles.reviewDetailDate, { color: isDark ? '#8E8E93' : '#666' }]}>
                        {formatDate(selectedReview.createdAt)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.reviewDetailComment, { color: isDark ? '#fff' : '#111' }]}>
                      {selectedReview.comment}
                    </ThemedText>
                    <ThemedText style={[styles.reviewDetailHomestay, { color: isDark ? '#8E8E93' : '#666' }]}>
                      Homestay: {selectedReview.homestay?.name}
                    </ThemedText>
                  </View>

                  <View style={styles.responseInputContainer}>
                    <ThemedText style={[styles.modalLabel, { color: isDark ? '#fff' : '#111' }]}>
                      Nội dung phản hồi <ThemedText style={{ color: '#ef4444' }}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.responseInput,
                        {
                          backgroundColor: isDark ? '#2C2C2E' : '#f8fafc',
                          color: isDark ? '#fff' : '#111',
                          borderColor: isDark ? '#2C2C2E' : '#e5e7eb',
                        },
                      ]}
                      placeholder="Nhập phản hồi cho khách hàng..."
                      placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                      value={responseText}
                      onChangeText={setResponseText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      maxLength={1000}
                    />
                    <ThemedText style={[styles.helperText, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {responseText.length}/1000 ký tự
                    </ThemedText>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}
                    onPress={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                      setSelectedReview(null);
                    }}
                  >
                    <ThemedText style={[styles.cancelButtonText, { color: isDark ? '#fff' : '#666' }]}>Hủy</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleSubmitResponse}
                    disabled={processingId !== null || !responseText.trim()}
                  >
                    {processingId ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <ThemedText style={styles.submitButtonText}>
                          {selectedReview.hostResponse ? 'Cập Nhật' : 'Gửi Phản Hồi'}
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 6,
    alignItems: 'stretch',
  },
  filterTab: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 50,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  filterTabActive: {
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    lineHeight: 18,
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
    fontSize: 16,
    marginTop: 16,
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoText: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
  },
  homestayName: {
    fontSize: 13,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
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
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  reviewDetailBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  reviewDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewDetailDate: {
    fontSize: 12,
  },
  reviewDetailComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDetailHomestay: {
    fontSize: 12,
  },
  responseInputContainer: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  responseInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 140,
    marginTop: 8,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});







