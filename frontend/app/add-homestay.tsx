import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHomestayForm } from '@/contexts/HomestayFormContext';
import AddressForm from '@/components/homestay/AddressForm';
import HomestayImagePicker from '@/components/homestay/ImagePicker';
import ToggleSwitch from '@/components/homestay/ToggleSwitch';

export default function AddHomestayScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading] = useState(false);

  const {
    formData,
    imageUris,
    updateField,
    updateAddress,
    updateImages,
    removeImage,
    validateForm,
  } = useHomestayForm();

  // Kiểm tra quyền truy cập
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để tiếp tục', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (user?.roleName !== 'host' && user?.roleName !== 'admin') {
      Alert.alert('Không có quyền', 'Chỉ host mới có thể tạo homestay', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
  }, [isAuthenticated, user]);

  // Chuyển sang trang chọn loại phòng
  const handleNext = () => {
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert('Lỗi', validation.error);
      return;
    }

    router.push('/add-homestay-rooms');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Thêm Homestay Mới</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Bước 1/4: Thông tin cơ bản</ThemedText>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.content}>
          {/* Tên Homestay */}
          <View style={[styles.section, styles.card]}>
            <View style={styles.labelContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="home" size={20} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.label}>Tên Homestay *</ThemedText>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: '#fafbfc', color: '#11181C' }]}
              placeholder="Nhập tên homestay..."
              placeholderTextColor="#9ca3af"
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              editable={!isLoading}
            />
          </View>

          {/* Mô tả */}
          <View style={[styles.section, styles.card]}>
            <View style={styles.labelContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={20} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.label}>Mô tả *</ThemedText>
            </View>
            <TextInput
              style={[styles.textArea, { backgroundColor: '#fafbfc', color: '#11181C' }]}
              placeholder="Nhập mô tả chi tiết về homestay của bạn..."
              placeholderTextColor="#9ca3af"
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          {/* Địa chỉ chi tiết */}
          <AddressForm
            address={formData.address}
            onAddressChange={updateAddress}
            disabled={isLoading}
          />

          {/* Google Maps Embed */}
          <View style={[styles.section, styles.card]}>
            <View style={styles.labelContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="map" size={20} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.label}>Mã nhúng Google Maps</ThemedText>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: '#fafbfc', color: '#11181C' }]}
              placeholder="Nhập mã nhúng hoặc link Google Maps..."
              placeholderTextColor="#9ca3af"
              value={formData.googleMapsEmbed}
              onChangeText={(value) => updateField('googleMapsEmbed', value)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLoading}
            />
            <View style={styles.hintContainer}>
              <Ionicons name="information-circle" size={18} color="#0a7ea4" />
              <ThemedText style={styles.hint}>
                Vào Google Maps - Chia sẻ - Nhúng bản đồ - Sao chép HTML và dán vào đây.
              </ThemedText>
            </View>
          </View>

          {/* Giá ước tính mỗi đêm */}
          <View style={[styles.section, styles.card]}>
            <View style={styles.labelContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="cash" size={20} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.label}>Giá ước tính mỗi đêm (VNĐ) *</ThemedText>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: '#fafbfc', color: '#11181C' }]}
              placeholder="Nhập giá ước tính..."
              placeholderTextColor="#9ca3af"
              value={formData.pricePerNight}
              onChangeText={(value) =>
                updateField('pricePerNight', value.replace(/[^0-9]/g, ''))
              }
              keyboardType="numeric"
              editable={!isLoading}
            />
            <ThemedText style={styles.hint}>
              Giá này sẽ được tự động cập nhật dựa trên giá các phòng bạn chọn
            </ThemedText>
          </View>

          {/* Hình ảnh */}
          <View style={[styles.section, styles.card]}>
            <View style={styles.labelContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="images" size={20} color="#0a7ea4" />
              </View>
              <ThemedText style={styles.label}>Hình ảnh *</ThemedText>
            </View>
            <HomestayImagePicker
              images={formData.images}
              imageUris={imageUris}
              onImagesChange={updateImages}
              onRemoveImage={removeImage}
              disabled={isLoading}
            />
          </View>

          {/* Nổi bật */}
          <View style={[styles.section, styles.card]}>
            <ToggleSwitch
              label="Nổi bật"
              value={formData.featured}
              onValueChange={(value) => updateField('featured', value)}
              trueLabel="Nổi bật"
              falseLabel="Không nổi bật"
              disabled={isLoading}
            />
          </View>

          {/* Đặt cọc */}
          <View style={[styles.section, styles.card]}>
            <ToggleSwitch
              label="Đặt cọc"
              value={formData.requireDeposit}
              onValueChange={(value) => updateField('requireDeposit', value)}
              trueLabel="Yêu cầu đặt cọc trước"
              falseLabel="Không cần đặt cọc trước"
              disabled={isLoading}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton2}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={20} color="#666" />
              <ThemedText style={styles.backButtonText}>Quay lại trang homestay</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleNext}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#0a7ea4', '#0d8bb8']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ThemedText style={styles.submitButtonText}>Tiếp theo</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#11181C',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 120,
    fontWeight: '500',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  hint: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    gap: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

