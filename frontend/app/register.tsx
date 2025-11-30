import React, { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '@/services/api';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    avatar: '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form'); // 'form' or 'otp'
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const { register } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    try {
      // Yêu cầu quyền truy cập
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh để chọn avatar');
        return;
      }

      // Mở image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Giảm quality để giảm kích thước
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        // Convert image to base64
        const base64 = await convertImageToBase64(uri);
        handleChange('avatar', base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  const takePhoto = async () => {
    try {
      // Yêu cầu quyền camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền camera để chụp ảnh');
        return;
      }

      // Mở camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Giảm quality để giảm kích thước
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        const base64 = await convertImageToBase64(uri);
        handleChange('avatar', base64);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.');
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Kiểm tra kích thước (giới hạn 5MB)
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

  const showImagePickerOptions = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chụp ảnh', onPress: takePhoto },
        { text: 'Chọn từ thư viện', onPress: pickImage },
      ],
      { cancelable: true }
    );
  };

  const validateForm = () => {
    // Validate username
    if (!formData.username.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập username');
      return false;
    }
    if (formData.username.trim().length < 3) {
      Alert.alert('Lỗi', 'Username phải có ít nhất 3 ký tự');
      return false;
    }
    if (formData.username.trim().length > 30) {
      Alert.alert('Lỗi', 'Username không được vượt quá 30 ký tự');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      Alert.alert('Lỗi', 'Username chỉ được chứa chữ cái, số và dấu gạch dưới');
      return false;
    }

    // Validate email
    if (!formData.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }

    // Validate phone (optional but must be valid if provided)
    if (formData.phone.trim() && !/^[0-9]{10,11}$/.test(formData.phone.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (10-11 chữ số)');
      return false;
    }

    // Validate password
    if (!formData.password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return false;
    }

    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        avatar: formData.avatar || undefined,
        roleName: 'user' as 'user' | 'host',
      };

      const response = await apiService.sendRegistrationOTP(registerData);
      
      if (response.success) {
        setOtpEmail(registerData.email);
        setStep('otp');
        setCountdown(60); // 60 seconds countdown
        // Start countdown timer
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        Alert.alert('Thành công', 'Mã xác thực đã được gửi đến email của bạn!');
      } else {
        throw new Error(response.message || 'Không thể gửi mã xác thực');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) {
      Alert.alert('Vui lòng đợi', `Vui lòng đợi ${countdown} giây trước khi gửi lại mã.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.resendOTP(otpEmail);
      if (response.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        Alert.alert('Thành công', 'Mã xác thực mới đã được gửi!');
      } else {
        throw new Error(response.message || 'Không thể gửi lại mã xác thực');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    // Xử lý paste nhiều ký tự
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtpCode = [...otpCode];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newOtpCode[index + i] = digit;
        }
      });
      setOtpCode(newOtpCode);
      
      // Focus vào input cuối cùng được điền
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      if (otpInputRefs.current[lastFilledIndex]) {
        otpInputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }
    
    // Chỉ cho phép số
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtpCode = [...otpCode];
    newOtpCode[index] = value;
    setOtpCode(newOtpCode);

    // Auto focus next input
    if (value && index < 5) {
      setTimeout(() => {
        otpInputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };

  const handleOTPKeyPress = (index: number, key: string) => {
    // Xử lý backspace để focus về input trước
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const fullOtp = otpCode.join('');
    
    if (fullOtp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ 6 chữ số');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.verifyOTP(otpEmail, fullOtp);
      
      if (response.success && response.data) {
        // Lưu token
        apiService.setToken(response.data.token);
        
        // Lưu token vào storage
        if (Platform.OS === 'web') {
          await AsyncStorage.setItem('auth_token', response.data.token);
        } else {
          await SecureStore.setItemAsync('auth_token', response.data.token);
        }
        
        Alert.alert('Thành công', 'Đăng ký thành công!', [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]);
      } else {
        throw new Error(response.message || 'Mã xác thực không đúng');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Mã xác thực không đúng. Vui lòng thử lại.');
      // Reset OTP inputs
      setOtpCode(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Đăng Ký</ThemedText>
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
          <View style={styles.iconContainer}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={showImagePickerOptions}
              disabled={isLoading}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={40} color="#0a7ea4" />
                </View>
              )}
              <View style={styles.avatarEditIcon}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <ThemedText style={styles.avatarHint}>
              Chạm để chọn ảnh đại diện
            </ThemedText>
          </View>

          <ThemedText style={styles.welcomeText}>
            Tạo tài khoản mới
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Điền thông tin để bắt đầu
          </ThemedText>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Username (tối thiểu 3 ký tự)"
                  placeholderTextColor={colors.icon}
                  value={formData.username}
                  onChangeText={(value) => handleChange('username', value)}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={colors.icon}
                  value={formData.email}
                  onChangeText={(value) => handleChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Số điện thoại (tùy chọn)"
                  placeholderTextColor={colors.icon}
                  value={formData.phone}
                  onChangeText={(value) => handleChange('phone', value)}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  placeholderTextColor={colors.icon}
                  value={formData.password}
                  onChangeText={(value) => handleChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Xác nhận mật khẩu"
                  placeholderTextColor={colors.icon}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#0a7ea4', '#0d8bb8']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Gửi Mã Xác Thực</ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>hoặc</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/login' as any)}
              disabled={isLoading}
            >
              <ThemedText style={styles.loginButtonText}>
                Đã có tài khoản?{' '}
                <ThemedText style={[styles.loginButtonText, { color: '#0a7ea4', fontWeight: '700' }]}>
                  Đăng nhập ngay
                </ThemedText>
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* OTP Verification Screen */}
      {step === 'otp' && (
        <View style={styles.otpOverlay}>
          <View style={styles.otpContainer}>
            <TouchableOpacity
              style={styles.otpBackButton}
              onPress={() => {
                setStep('form');
                setOtpCode(['', '', '', '', '', '']);
                setCountdown(0);
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#0a7ea4" />
            </TouchableOpacity>

            <ThemedText style={styles.otpTitle}>Xác Thực Email</ThemedText>
            
            <View style={styles.otpEmailContainer}>
              <ThemedText style={styles.otpSubtitle}>
                Chúng tôi đã gửi mã xác thực đến:
              </ThemedText>
              <ThemedText style={styles.otpEmail} numberOfLines={1} ellipsizeMode="middle">
                {otpEmail}
              </ThemedText>
            </View>

            <View style={styles.otpInputContainer}>
              {otpCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpInputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    digit && styles.otpInputFilled,
                    { color: colors.text, borderColor: digit ? '#0a7ea4' : colors.icon }
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOTPChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleOTPKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isLoading}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={countdown > 0 || isLoading}
            >
              <ThemedText style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                isLoading && styles.buttonDisabled,
                styles.verifyButton,
              ]}
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#0a7ea4', '#0d8bb8']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.buttonText}>Xác Thực</ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    marginTop: 20,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarEditIcon: {
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
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#11181C',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginButtonText: {
    fontSize: 15,
    color: '#666',
  },
  otpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  otpContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  otpBackButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 6,
    zIndex: 1,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  otpEmailContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
  },
  otpEmail: {
    fontWeight: '700',
    color: '#0a7ea4',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '100%',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
    gap: 8,
    paddingHorizontal: 8,
  },
  otpInput: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: '#f8fafc',
    borderColor: '#e0e0e0',
  },
  otpInputFilled: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  resendButton: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#999',
  },
  verifyButton: {
    width: '100%',
    marginTop: 4,
  },
});
