import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

const COMPLAINT_TYPES = [
  { value: 'homestay', label: 'Khiếu nại về Homestay', icon: 'home-outline' },
  { value: 'booking', label: 'Khiếu nại về Đặt phòng', icon: 'calendar-outline' },
  { value: 'payment', label: 'Khiếu nại về Thanh toán', icon: 'card-outline' },
  { value: 'service', label: 'Khiếu nại về Dịch vụ', icon: 'build-outline' },
  { value: 'host', label: 'Khiếu nại về Chủ nhà', icon: 'person-outline' },
  { value: 'other', label: 'Khiếu nại khác', icon: 'ellipse-outline' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Thấp', color: '#6b7280' },
  { value: 'medium', label: 'Trung bình', color: '#f59e0b' },
  { value: 'high', label: 'Cao', color: '#ef4444' },
  { value: 'urgent', label: 'Khẩn cấp', color: '#dc2626' },
];

export default function ComplaintScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [formData, setFormData] = useState({
    type: '',
    title: '',
    content: '',
    priority: 'medium',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để gửi khiếu nại', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }
  }, [isAuthenticated]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.type) {
      return { isValid: false, error: 'Vui lòng chọn loại khiếu nại' };
    }
    if (!formData.title || formData.title.trim().length < 5) {
      return { isValid: false, error: 'Tiêu đề phải có ít nhất 5 ký tự' };
    }
    if (!formData.content || formData.content.trim().length < 10) {
      return { isValid: false, error: 'Nội dung phải có ít nhất 10 ký tự' };
    }
    return { isValid: true };
  };

  const handleSubmit = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Lỗi', validation.error);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.createComplaint({
        type: formData.type,
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
      });

      if (response.success) {
        Alert.alert(
          'Thành công',
          'Khiếu nại của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(response.message || 'Không thể gửi khiếu nại');
      }
    } catch (error: any) {
      console.error('Error submitting complaint:', error);
      Alert.alert('Lỗi', error.message || 'Không thể gửi khiếu nại. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle}>Gửi Khiếu Nại</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Chúng tôi luôn lắng nghe</ThemedText>
        </View>
        <View style={styles.headerRightSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loại khiếu nại */}
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <ThemedText style={[styles.label, { color: isDark ? '#fff' : '#11181C' }]}>
              Loại khiếu nại <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <ThemedText style={[styles.labelHint, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
              Vui lòng chọn loại phù hợp nhất
            </ThemedText>
          </View>
          <View style={styles.typeGrid}>
            {COMPLAINT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#fff',
                    borderColor:
                      formData.type === type.value ? '#ef4444' : isDark ? '#2C2C2E' : '#e5e7eb',
                    borderWidth: formData.type === type.value ? 2 : 1,
                  },
                ]}
                onPress={() => handleChange('type', type.value)}
                activeOpacity={0.7}
              >
                <View style={styles.typeCardContent}>
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={
                      formData.type === type.value
                        ? '#ef4444'
                        : isDark
                        ? '#8E8E93'
                        : '#6b7280'
                    }
                  />
                  <ThemedText
                    style={[
                      styles.typeCardText,
                      {
                        color:
                          formData.type === type.value
                            ? '#ef4444'
                            : isDark
                            ? '#fff'
                            : '#11181C',
                        fontWeight: formData.type === type.value ? '600' : '400',
                      },
                    ]}
                  >
                    {type.label}
                  </ThemedText>
                </View>
                {formData.type === type.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#ef4444" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mức độ ưu tiên */}
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <ThemedText style={[styles.label, { color: isDark ? '#fff' : '#11181C' }]}>
              Mức độ ưu tiên
            </ThemedText>
            <ThemedText style={[styles.labelHint, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
              Giúp chúng tôi ưu tiên xử lý
            </ThemedText>
          </View>
          <View style={styles.priorityRow}>
            {PRIORITY_LEVELS.map((priority) => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityCard,
                  {
                    backgroundColor:
                      formData.priority === priority.value ? priority.color : isDark ? '#1C1C1E' : '#fff',
                    borderColor:
                      formData.priority === priority.value ? priority.color : isDark ? '#2C2C2E' : '#e5e7eb',
                  },
                ]}
                onPress={() => handleChange('priority', priority.value)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[
                    styles.priorityCardText,
                    {
                      color:
                        formData.priority === priority.value
                          ? '#fff'
                          : isDark
                          ? '#8E8E93'
                          : '#6b7280',
                      fontWeight: formData.priority === priority.value ? '600' : '500',
                    },
                  ]}
                >
                  {priority.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tiêu đề */}
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <ThemedText style={[styles.label, { color: isDark ? '#fff' : '#11181C' }]}>
              Tiêu đề <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#fff',
                color: isDark ? '#fff' : '#11181C',
                borderColor: isDark ? '#2C2C2E' : '#e5e7eb',
              },
            ]}
            placeholder="Ví dụ: Homestay không đúng như mô tả"
            placeholderTextColor={isDark ? '#8E8E93' : '#9ca3af'}
            value={formData.title}
            onChangeText={(text) => handleChange('title', text)}
            maxLength={200}
          />
          <View style={styles.helperTextContainer}>
            <ThemedText style={[styles.helperText, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
              {formData.title.length}/200 ký tự
              {formData.title.length < 5 && formData.title.length > 0 && (
                <ThemedText style={{ color: '#ef4444' }}>
                  {' '}• Tối thiểu 5 ký tự
                </ThemedText>
              )}
            </ThemedText>
          </View>
        </View>

        {/* Nội dung */}
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <ThemedText style={[styles.label, { color: isDark ? '#fff' : '#11181C' }]}>
              Nội dung khiếu nại <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <ThemedText style={[styles.labelHint, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
              Mô tả chi tiết vấn đề bạn gặp phải
            </ThemedText>
          </View>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#fff',
                color: isDark ? '#fff' : '#11181C',
                borderColor: isDark ? '#2C2C2E' : '#e5e7eb',
              },
            ]}
            placeholder="Vui lòng cung cấp thông tin chi tiết về vấn đề, bao gồm: thời gian xảy ra, địa điểm, những gì đã xảy ra..."
            placeholderTextColor={isDark ? '#8E8E93' : '#9ca3af'}
            value={formData.content}
            onChangeText={(text) => handleChange('content', text)}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={2000}
          />
          <View style={styles.helperTextContainer}>
            <ThemedText style={[styles.helperText, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
              {formData.content.length}/2000 ký tự
              {formData.content.length < 10 && formData.content.length > 0 && (
                <ThemedText style={{ color: '#ef4444' }}>
                  {' '}• Tối thiểu 10 ký tự
                </ThemedText>
              )}
            </ThemedText>
          </View>
        </View>

        {/* Lưu ý */}
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#fef3c7',
              borderColor: isDark ? '#2C2C2E' : '#fcd34d',
            },
          ]}
        >
          <View style={styles.noteIconContainer}>
            <Ionicons name="information-circle" size={22} color={isDark ? '#f59e0b' : '#d97706'} />
          </View>
          <View style={styles.noteTextContainer}>
            <ThemedText
              style={[
                styles.noteTitle,
                { color: isDark ? '#fbbf24' : '#92400e' },
              ]}
            >
              Lưu ý quan trọng
            </ThemedText>
            <ThemedText
              style={[
                styles.noteText,
                { color: isDark ? '#fbbf24' : '#92400e' },
              ]}
            >
              Chúng tôi sẽ xem xét khiếu nại của bạn và phản hồi trong vòng 24-48 giờ. Vui lòng cung cấp thông tin chi tiết và chính xác để chúng tôi có thể hỗ trợ bạn tốt nhất.
            </ThemedText>
          </View>
        </View>

        {/* Nút gửi */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isLoading || !formData.type || !formData.title || !formData.content) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading || !formData.type || !formData.title || !formData.content}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <ThemedText style={styles.submitButtonText}>Gửi Khiếu Nại</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  labelContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  labelHint: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  required: {
    color: '#ef4444',
    fontWeight: '700',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeCardText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  priorityCard: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCardText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 160,
    lineHeight: 22,
  },
  helperTextContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 16,
  },
  noteBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 14,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  noteIconContainer: {
    marginTop: 2,
  },
  noteTextContainer: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'left',
  },
  submitButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

