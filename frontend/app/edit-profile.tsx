import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { apiService, getAvatarUrl } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams } from 'expo-router';

export default function EditProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    avatar: null as string | null,
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Email change OTP states
  const [emailChanged, setEmailChanged] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [emailOTPVerified, setEmailOTPVerified] = useState(false);
  const [otpError, setOtpError] = useState('');

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Nếu có userId, load user đó (admin edit user khác)
      // Nếu không, load current user
      let targetUser = user;
      
      if (userId && userId !== user?._id) {
        // Admin editing another user - need to fetch user data
        // For now, we'll use current user data
        // TODO: Add API to get user by ID for admin
        targetUser = user;
      }

      if (targetUser) {
        setFormData({
          username: targetUser.username || '',
          email: targetUser.email || '',
          phone: (targetUser as any).phone || '',
          avatar: targetUser.avatar || null,
        });
        setAvatarUri(targetUser.avatar ? getAvatarUrl(targetUser.avatar) : null);
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Check if email changed
    if (field === 'email') {
      const emailChanged = value.trim().toLowerCase() !== user?.email?.toLowerCase();
      setEmailChanged(emailChanged);
      
      if (emailChanged) {
        // Reset OTP verification state when email changes
        setEmailOTPVerified(false);
        setShowOTPForm(false);
        setOtpCode('');
        setOtpError('');
      } else {
        // Email back to original, hide OTP form
        setShowOTPForm(false);
        setEmailOTPVerified(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username là bắt buộc';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username phải có ít nhất 3 ký tự';
    } else if (formData.username.trim().length > 30) {
      newErrors.username = 'Username không được vượt quá 30 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      newErrors.username = 'Username chỉ được chứa chữ cái, số và dấu gạch dưới';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Email không hợp lệ';
      }
    }

    if (formData.phone && formData.phone.trim()) {
      if (!/^[0-9]{10,11}$/.test(formData.phone.trim())) {
        newErrors.phone = 'Số điện thoại không hợp lệ (10-11 chữ số)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error: any) {
      throw new Error(error.message || 'Không thể convert ảnh');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;

        // Check size
        const response = await fetch(uri);
        const blob = await response.blob();
        const sizeInMB = blob.size / 1024 / 1024;
        if (sizeInMB > 5) {
          Alert.alert('Lỗi', 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB');
          return;
        }

        setAvatarUri(uri);
        const base64 = await convertImageToBase64(uri);
        setFormData(prev => ({ ...prev, avatar: base64 }));
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chọn ảnh');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;

        setAvatarUri(uri);
        const base64 = await convertImageToBase64(uri);
        setFormData(prev => ({ ...prev, avatar: base64 }));
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chụp ảnh');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chọn từ thư viện', onPress: pickImage },
        { text: 'Chụp ảnh', onPress: takePhoto },
        { text: 'Xóa ảnh', onPress: () => {
          setAvatarUri(null);
          setFormData(prev => ({ ...prev, avatar: null }));
        }, style: 'destructive' },
      ]
    );
  };

  // Send OTP for email change
  const handleSendOTP = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin email');
      return;
    }

    try {
      setIsSendingOTP(true);
      setOtpError('');
      
      const newEmail = formData.email.trim().toLowerCase();
      const response = await apiService.sendEmailChangeOTP(newEmail);

      if (response.success) {
        setShowOTPForm(true);
        Alert.alert(
          'Thành công',
          `Mã xác thực đã được gửi đến email mới: ${newEmail}\nVui lòng kiểm tra hộp thư và nhập mã OTP để xác thực.`
        );
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setOtpError(error.message || 'Không thể gửi mã xác thực');
      Alert.alert('Lỗi', error.message || 'Không thể gửi mã xác thực');
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Verify OTP for email change
  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      setOtpError('Vui lòng nhập mã xác thực');
      return;
    }

    if (otpCode.trim().length !== 6) {
      setOtpError('Mã xác thực phải có 6 chữ số');
      return;
    }

    try {
      setIsVerifyingOTP(true);
      setOtpError('');
      
      const newEmail = formData.email.trim().toLowerCase();
      const response = await apiService.verifyEmailChangeOTP(newEmail, otpCode.trim());

      if (response.success) {
        setEmailOTPVerified(true);
        setShowOTPForm(false);
        Alert.alert('Thành công', 'Email đã được xác thực. Bạn có thể lưu thay đổi.');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setOtpError(error.message || 'Mã xác thực không đúng');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    await handleSendOTP();
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    // Check if email changed and not verified
    if (emailChanged && !emailOTPVerified) {
      Alert.alert(
        'Cần xác thực email',
        'Email đã thay đổi. Vui lòng xác thực email mới bằng mã OTP trước khi lưu.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Gửi mã OTP', onPress: handleSendOTP },
        ]
      );
      return;
    }

    try {
      setIsSaving(true);

      const updateData: any = {};
      
      // Chỉ gửi các field đã thay đổi
      if (formData.username.trim() !== user?.username) {
        updateData.username = formData.username.trim();
      }
      if (formData.email.trim().toLowerCase() !== user?.email?.toLowerCase()) {
        updateData.email = formData.email.trim().toLowerCase();
        updateData.emailChangeOTPVerified = true; // Mark as verified
      }
      if (formData.phone !== (user as any)?.phone) {
        updateData.phone = formData.phone.trim() || null;
      }
      if (formData.avatar !== user?.avatar) {
        updateData.avatar = formData.avatar;
      }

      // Nếu không có thay đổi nào
      if (Object.keys(updateData).length === 0) {
        Alert.alert('Thông báo', 'Không có thay đổi nào');
        router.back();
        return;
      }

      const targetUserId = userId && userId !== user?._id ? userId : null;
      const response = await apiService.updateProfile(targetUserId, updateData);

      if (response.success) {
        Alert.alert('Thành công', 'Cập nhật thông tin thành công', [
          {
            text: 'OK',
            onPress: async () => {
              // Refresh user data
              if (refreshUser) {
                await refreshUser();
              }
              router.back();
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông tin');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Chỉnh Sửa Thông Tin</ThemedText>
        <View style={styles.placeholder} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={showImagePickerOptions}
              activeOpacity={0.7}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + '20' }]}>
                  <Ionicons name="person" size={60} color={colors.icon} />
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <ThemedText style={styles.avatarHint}>
              Chạm để thay đổi ảnh đại diện
            </ThemedText>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Username */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Username *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  errors.username && styles.inputError,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: isDark ? '#fff' : '#000' },
                ]}
                placeholder="Nhập username"
                placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
                value={formData.username}
                onChangeText={(value) => handleChange('username', value)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.username && (
                <ThemedText style={styles.errorText}>{errors.username}</ThemedText>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.inputError,
                  emailChanged && !emailOTPVerified && styles.inputWarning,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: isDark ? '#fff' : '#000' },
                ]}
                placeholder="Nhập email"
                placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSaving}
              />
              {errors.email && (
                <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
              )}
              {emailChanged && !emailOTPVerified && (
                <ThemedText style={styles.warningText}>
                  ⚠️ Email đã thay đổi. Vui lòng xác thực email mới bằng mã OTP.
                </ThemedText>
              )}
              {emailChanged && emailOTPVerified && (
                <ThemedText style={styles.successText}>
                  ✓ Email đã được xác thực
                </ThemedText>
              )}
              {emailChanged && !showOTPForm && !emailOTPVerified && (
                <TouchableOpacity
                  style={styles.sendOTPButton}
                  onPress={handleSendOTP}
                  disabled={isSendingOTP}
                >
                  {isSendingOTP ? (
                    <ActivityIndicator size="small" color="#0a7ea4" />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={16} color="#0a7ea4" />
                      <ThemedText style={styles.sendOTPButtonText}>Gửi mã OTP</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* OTP Form */}
            {showOTPForm && !emailOTPVerified && (
              <View style={styles.otpSection}>
                <View style={styles.otpHeader}>
                  <ThemedText style={styles.otpTitle}>Nhập mã xác thực</ThemedText>
                  <ThemedText style={styles.otpSubtitle}>
                    Mã OTP đã được gửi đến: {formData.email.trim().toLowerCase()}
                  </ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.otpInput,
                    otpError && styles.inputError,
                    { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: isDark ? '#fff' : '#000' },
                  ]}
                  placeholder="Nhập 6 chữ số"
                  placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
                  value={otpCode}
                  onChangeText={(value) => {
                    setOtpCode(value.replace(/[^0-9]/g, '').slice(0, 6));
                    setOtpError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {otpError && (
                  <ThemedText style={styles.errorText}>{otpError}</ThemedText>
                )}
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    style={styles.resendOTPButton}
                    onPress={handleResendOTP}
                    disabled={isSendingOTP}
                  >
                    <ThemedText style={styles.resendOTPText}>
                      {isSendingOTP ? 'Đang gửi...' : 'Gửi lại mã'}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.verifyOTPButton}
                    onPress={handleVerifyOTP}
                    disabled={isVerifyingOTP || otpCode.length !== 6}
                  >
                    {isVerifyingOTP ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <ThemedText style={styles.verifyOTPText}>Xác thực</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Phone */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Số điện thoại</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  errors.phone && styles.inputError,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: isDark ? '#fff' : '#000' },
                ]}
                placeholder="Nhập số điện thoại (10-11 chữ số)"
                placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
                value={formData.phone}
                onChangeText={(value) => handleChange('phone', value)}
                keyboardType="phone-pad"
                maxLength={11}
              />
              {errors.phone && (
                <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSaving || (emailChanged && !emailOTPVerified)) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSaving || (emailChanged && !emailOTPVerified)}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <ThemedText style={styles.submitButtonText}>
                  {emailChanged && !emailOTPVerified ? 'Cần xác thực email' : 'Lưu Thay Đổi'}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#0a7ea4',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0a7ea4',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarHint: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  formSection: {
    gap: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  inputWarning: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  sendOTPButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0a7ea4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  sendOTPButtonText: {
    color: '#0a7ea4',
    fontSize: 14,
    fontWeight: '600',
  },
  otpSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  otpHeader: {
    marginBottom: 16,
  },
  otpTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  otpSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  otpInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#0a7ea4',
    marginBottom: 12,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  resendOTPButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendOTPText: {
    color: '#0a7ea4',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyOTPButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  verifyOTPText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


