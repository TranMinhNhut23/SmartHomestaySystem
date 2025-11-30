import React, { useState, useEffect, useRef } from 'react';
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
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '@/services/api';

type Step = 'identifier' | 'otp' | 'newPassword';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [captchaSessionId, setCaptchaSessionId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaTransforms, setCaptchaTransforms] = useState<Array<{ rotate: number; scale: number; color: string }>>([]);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // Load captcha khi vào màn hình
  useEffect(() => {
    loadCaptcha();
  }, []);

  const loadCaptcha = async () => {
    try {
      const response = await apiService.generateCaptcha();
      if (response.success && response.data) {
        setCaptchaSessionId(response.data.sessionId);
        setCaptchaQuestion(response.data.question);
        
        // Tạo transforms cố định cho mỗi ký tự
        const transforms = response.data.question.split('').map(() => ({
          rotate: (Math.random() - 0.5) * 20, // -10 đến +10 độ
          scale: 0.85 + Math.random() * 0.3, // 0.85 đến 1.15
          color: Math.random() > 0.5 ? '#0a7ea4' : '#0d8bb8',
        }));
        setCaptchaTransforms(transforms);
      }
    } catch (error: any) {
      console.error('Error loading captcha:', error);
    }
  };

  const handleRequestReset = async () => {
    if (!identifier.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc username');
      return;
    }

    if (!captchaAnswer.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã captcha');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.requestPasswordReset(
        identifier.trim(),
        captchaSessionId,
        captchaAnswer.trim()
      );

      if (response.success && response.data) {
        setOtpEmail(response.data.email);
        setStep('otp');
        setCountdown(60);
        // Start countdown
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
      // Reload captcha nếu có lỗi
      loadCaptcha();
      setCaptchaAnswer('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtpCode = [...otpCode];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newOtpCode[index + i] = digit;
        }
      });
      setOtpCode(newOtpCode);
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      if (otpInputRefs.current[lastFilledIndex]) {
        otpInputRefs.current[lastFilledIndex]?.focus();
      }
      return;
    }

    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtpCode = [...otpCode];
    newOtpCode[index] = value;
    setOtpCode(newOtpCode);

    if (value && index < 5) {
      setTimeout(() => {
        otpInputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };

  const handleOTPKeyPress = (index: number, key: string) => {
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
      const response = await apiService.verifyPasswordResetOTP(otpEmail, fullOtp);

      if (response.success) {
        setStep('newPassword');
        Alert.alert('Thành công', 'Mã xác thực hợp lệ. Vui lòng nhập mật khẩu mới.');
      } else {
        throw new Error(response.message || 'Mã xác thực không đúng');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Mã xác thực không đúng. Vui lòng thử lại.');
      setOtpCode(['', '', '', '', '', '']);
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
      const response = await apiService.resendPasswordResetOTP(identifier.trim());
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

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    const fullOtp = otpCode.join('');

    setIsLoading(true);
    try {
      const response = await apiService.resetPassword(
        otpEmail,
        fullOtp,
        newPassword,
        confirmPassword
      );

      if (response.success) {
        Alert.alert('Thành công', 'Đặt lại mật khẩu thành công!', [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]);
      } else {
        throw new Error(response.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
              onPress={() => {
                if (step === 'identifier') {
                  router.back();
                } else if (step === 'otp') {
                  setStep('identifier');
                  setOtpCode(['', '', '', '', '', '']);
                  setCountdown(0);
                } else {
                  setStep('otp');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Step 1: Identifier & Captcha */}
          {step === 'identifier' && (
            <>
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-closed" size={48} color="#0a7ea4" />
                </View>
              </View>

              <ThemedText style={styles.title}>Quên Mật Khẩu?</ThemedText>
              <ThemedText style={styles.subtitle}>
                Nhập email hoặc username để nhận mã xác thực
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
                      placeholder="Email hoặc Username"
                      placeholderTextColor={colors.icon}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={styles.captchaContainer}>
                  <View style={styles.captchaBox}>
                    <ThemedText style={styles.captchaLabel}>Mã xác thực:</ThemedText>
                    <View style={styles.captchaContent}>
                      <View style={styles.captchaTextContainer}>
                        {captchaQuestion.split('').map((char, index) => {
                          const transform = captchaTransforms[index] || { rotate: 0, scale: 1, color: '#0a7ea4' };
                          return (
                            <ThemedText
                              key={index}
                              style={[
                                styles.captchaChar,
                                {
                                  transform: [
                                    { rotate: `${transform.rotate}deg` },
                                    { scale: transform.scale }
                                  ],
                                  color: transform.color,
                                }
                              ]}
                            >
                              {char}
                            </ThemedText>
                          );
                        })}
                      </View>
                      <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={loadCaptcha}
                        disabled={isLoading}
                      >
                        <Ionicons name="refresh" size={20} color="#0a7ea4" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TextInput
                    style={[styles.captchaInput, { color: colors.text, borderColor: colors.icon }]}
                    placeholder="Nhập mã xác thực"
                    placeholderTextColor={colors.icon}
                    value={captchaAnswer}
                    onChangeText={setCaptchaAnswer}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleRequestReset}
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
              </View>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <>
              <ThemedText style={styles.title}>Xác Thực Email</ThemedText>
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
                style={[styles.button, isLoading && styles.buttonDisabled]}
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
            </>
          )}

          {/* Step 3: New Password */}
          {step === 'newPassword' && (
            <>
              <ThemedText style={styles.title}>Mật Khẩu Mới</ThemedText>
              <ThemedText style={styles.subtitle}>
                Vui lòng nhập mật khẩu mới cho tài khoản của bạn
              </ThemedText>

              <View style={styles.form}>
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
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      placeholderTextColor={colors.icon}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
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
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
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
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
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
                      <ThemedText style={styles.buttonText}>Đặt Lại Mật Khẩu</ThemedText>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
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
  placeholder: {
    width: 40,
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
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
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
  captchaContainer: {
    marginBottom: 24,
  },
  captchaBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  captchaLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  captchaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captchaTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  captchaChar: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  refreshButton: {
    padding: 8,
  },
  captchaInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: 'center',
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
    marginBottom: 20,
    paddingVertical: 4,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#999',
  },
});

