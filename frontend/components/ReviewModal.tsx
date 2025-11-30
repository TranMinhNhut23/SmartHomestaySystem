import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from './themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService, getReviewImageUrl } from '@/services/api';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  homestayName: string;
  onReviewSubmitted?: () => void;
  existingReview?: any;
  readonly?: boolean; // Nếu true, không cho chỉnh sửa (chỉ xem)
}

export function ReviewModal({
  visible,
  onClose,
  bookingId,
  homestayName,
  onReviewSubmitted,
  existingReview,
  readonly = false,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [details, setDetails] = useState({
    cleanliness: 5,
    location: 5,
    value: 5,
    service: 5,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && existingReview) {
      setRating(existingReview.rating || 5);
      setComment(existingReview.comment || '');
      
      // Xử lý images - giữ nguyên URLs gốc trong images array
      // Và convert thành full URL cho imageUris để hiển thị
      const existingImages = existingReview.images || [];
      setImages(existingImages); // Giữ nguyên URLs gốc (relative hoặc absolute)
      // Convert URLs thành full URLs để hiển thị trong Image component
      const imageUrisForDisplay = existingImages.map((img: string) => {
        if (img.startsWith('http') || img.startsWith('data:image')) {
          return img; // Đã là full URL hoặc base64
        }
        // Relative URL - convert thành full URL để hiển thị
        return getReviewImageUrl(img) || img;
      });
      setImageUris(imageUrisForDisplay);
      
      setDetails(existingReview.details || {
        cleanliness: 5,
        location: 5,
        value: 5,
        service: 5,
      });
      // Scroll to top khi mở modal
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    } else if (visible && !existingReview) {
      // Reset form when opening new review
      setRating(5);
      setComment('');
      setImages([]);
      setImageUris([]);
      setDetails({
        cleanliness: 5,
        location: 5,
        value: 5,
        service: 5,
      });
      // Scroll to top khi mở modal
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  }, [visible, existingReview]);

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const sizeInMB = (base64String.length * 3) / 4 / 1024 / 1024;
          if (sizeInMB > 5) {
            reject(new Error('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB'));
            return;
          }
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      throw new Error(error.message || 'Không thể convert ảnh');
    }
  };

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages: string[] = [];
        const newUris: string[] = [];

        for (const asset of result.assets) {
          try {
            if (images.length + newImages.length >= 10) {
              Alert.alert('Giới hạn', 'Bạn chỉ có thể tải tối đa 10 ảnh');
              break;
            }
            const base64 = await convertImageToBase64(asset.uri);
            newImages.push(base64);
            newUris.push(asset.uri);
          } catch (error: any) {
            console.error('Error converting image:', error);
            Alert.alert('Lỗi', `Không thể tải ảnh: ${error.message}`);
          }
        }

        if (newImages.length > 0) {
          setImages([...images, ...newImages]);
          setImageUris([...imageUris, ...newUris]);
        }
      }
    } catch (error: any) {
      console.error('Error picking images:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chọn ảnh');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImageUris(imageUris.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nhận xét của bạn');
      return;
    }

    try {
      setIsSubmitting(true);

      // Chuẩn bị images - giữ nguyên URLs đã có (không phải base64) và thêm base64 mới
      const existingImageUrls = images.filter(img => !img.startsWith('data:image'));
      const newBase64Images = images.filter(img => img.startsWith('data:image'));
      const finalImages = [...existingImageUrls, ...newBase64Images];

      const reviewData = {
        bookingId,
        rating,
        comment: comment.trim(),
        images: finalImages,
        details,
        isPublic: true,
      };

      let response;
      if (existingReview) {
        // Cập nhật review - chỉ gửi các trường đã thay đổi
        const updateData: any = {
          rating,
          comment: comment.trim(),
          images: finalImages,
          details,
        };
        response = await apiService.updateReview(existingReview._id, updateData);
      } else {
        response = await apiService.createReview(reviewData);
      }

      if (response.success) {
        Alert.alert('Thành công', existingReview ? 'Đánh giá đã được cập nhật' : 'Đánh giá đã được gửi', [
          {
            text: 'OK',
            onPress: () => {
              onReviewSubmitted?.();
              onClose();
            },
          },
        ]);
      } else {
        throw new Error(response.message || 'Không thể gửi đánh giá');
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Lỗi', error.message || 'Không thể gửi đánh giá. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange: (value: number) => void, label: string) => {
    return (
      <View style={styles.ratingRow}>
        <ThemedText style={styles.ratingLabel}>{label}</ThemedText>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => !readonly && onChange(star)}
              activeOpacity={readonly ? 1 : 0.7}
              style={styles.starButton}
              disabled={readonly}
            >
              <Ionicons
                name={star <= value ? 'star' : 'star-outline'}
                size={24}
                color={star <= value ? '#fbbf24' : '#cbd5e1'}
              />
            </TouchableOpacity>
          ))}
          <ThemedText style={styles.ratingValue}>{value}/5</ThemedText>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Ionicons name="star" size={24} color="#0a7ea4" />
                </View>
                <View>
                  <ThemedText style={styles.headerTitle}>
                    {readonly ? 'Đánh giá của bạn' : existingReview ? 'Chỉnh sửa đánh giá' : 'Đánh giá homestay'}
                  </ThemedText>
                  <ThemedText style={styles.headerSubtitle}>{homestayName}</ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={isSubmitting}
              >
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Overall Rating */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Đánh giá tổng quan</ThemedText>
                <View style={styles.overallStarsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => !readonly && setRating(star)}
                      activeOpacity={readonly ? 1 : 0.7}
                      style={styles.starButton}
                      disabled={readonly}
                    >
                      <Ionicons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40}
                        color={star <= rating ? '#fbbf24' : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <ThemedText style={styles.ratingText}>{rating}/5 sao</ThemedText>
              </View>

              {/* Detailed Ratings */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Đánh giá chi tiết</ThemedText>
                {renderStars(details.cleanliness, (value) => setDetails({ ...details, cleanliness: value }), 'Vệ sinh')}
                {renderStars(details.location, (value) => setDetails({ ...details, location: value }), 'Vị trí')}
                {renderStars(details.value, (value) => setDetails({ ...details, value }), 'Giá trị')}
                {renderStars(details.service, (value) => setDetails({ ...details, service: value }), 'Dịch vụ')}
              </View>

              {/* Comment */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Nhận xét của bạn *</ThemedText>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  placeholderTextColor="#94a3b8"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={6}
                  maxLength={2000}
                  editable={!isSubmitting && !readonly}
                />
                <ThemedText style={styles.charCount}>
                  {comment.length}/2000 ký tự
                </ThemedText>
              </View>

              {/* Images */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>Hình ảnh</ThemedText>
                  <ThemedText style={styles.sectionHint}>(Tối đa 10 ảnh)</ThemedText>
                </View>
                {!readonly && (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickImages}
                    disabled={isSubmitting || images.length >= 10}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="image-outline" size={20} color="#0a7ea4" />
                    <ThemedText style={styles.uploadButtonText}>
                      {images.length >= 10 ? 'Đã đạt giới hạn' : 'Thêm ảnh'}
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {imageUris.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaContainer}>
                    {imageUris.map((uri, index) => (
                      <View key={index} style={styles.mediaItem}>
                        <Image source={{ uri }} style={styles.mediaPreview} />
                        {!readonly && (
                          <TouchableOpacity
                            style={styles.removeMediaButton}
                            onPress={() => removeImage(index)}
                            disabled={isSubmitting}
                          >
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </ScrollView>

            {/* Submit Button */}
            {!readonly && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || !comment.trim()}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#0a7ea4', '#0d8bb8']}
                    style={styles.submitButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <ThemedText style={styles.submitButtonText}>
                          {existingReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                        </ThemedText>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    maxHeight: '100%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
    flexGrow: 1,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  overallStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a7ea4',
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
    minWidth: 35,
  },
  commentInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 30,
    fontSize: 15,
    color: '#11181C',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 500,
    maxHeight: 600,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0a7ea4',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  mediaContainer: {
    marginTop: 12,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

