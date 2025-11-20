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
  Image,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

export default function HostRequestFormScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    address: '',
    idCardFront: '',
    idCardBack: '',
    reason: '',
    homestayProof: '',
    termsAccepted: false,
  });

  const [idCardFrontUri, setIdCardFrontUri] = useState<string | null>(null);
  const [idCardBackUri, setIdCardBackUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để gửi yêu cầu trở thành host', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (user?.roleName === 'host' || user?.roleName === 'admin') {
      Alert.alert('Thông báo', 'Bạn đã là host rồi', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
  }, [isAuthenticated, user]);

  // Set calendar month when opening date picker
  useEffect(() => {
    if (showDatePicker) {
      if (selectedDate) {
        setCalendarMonth(selectedDate);
      } else {
        // Default to a reasonable date (e.g., 30 years ago)
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 30);
        setCalendarMonth(defaultDate);
      }
    }
  }, [showDatePicker]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const pickImage = async (side: 'front' | 'back') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (side === 'front') {
          setIdCardFrontUri(uri);
          const base64 = await convertImageToBase64(uri);
          handleChange('idCardFront', base64);
        } else {
          setIdCardBackUri(uri);
          const base64 = await convertImageToBase64(uri);
          handleChange('idCardBack', base64);
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chọn ảnh');
    }
  };

  const takePhoto = async (side: 'front' | 'back') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (side === 'front') {
          setIdCardFrontUri(uri);
          const base64 = await convertImageToBase64(uri);
          handleChange('idCardFront', base64);
        } else {
          setIdCardBackUri(uri);
          const base64 = await convertImageToBase64(uri);
          handleChange('idCardBack', base64);
        }
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chụp ảnh');
    }
  };

  const showImagePicker = (side: 'front' | 'back') => {
    Alert.alert(
      'Chọn ảnh CCCD',
      side === 'front' ? 'Chọn ảnh mặt trước CCCD' : 'Chọn ảnh mặt sau CCCD',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Chụp ảnh', onPress: () => takePhoto(side) },
        { text: 'Chọn từ thư viện', onPress: () => pickImage(side) },
      ]
    );
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return firstDay.getDay();
  };

  const getCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const changeCalendarMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(calendarMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCalendarMonth(newMonth);
  };

  const formatDateForDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForBackend = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (day: number) => {
    const selected = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Không cho chọn ngày trong tương lai
    if (selected > today) {
      Alert.alert('Lỗi', 'Ngày sinh không thể là ngày trong tương lai');
      return;
    }

    setSelectedDate(selected);
    const formattedDate = formatDateForDisplay(selected);
    handleChange('dateOfBirth', formattedDate);
    setShowDatePicker(false);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return false;
    }
    if (!formData.dateOfBirth.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày sinh');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ');
      return false;
    }
    if (!formData.idCardFront) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh mặt trước CCCD');
      return false;
    }
    if (!formData.idCardBack) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh mặt sau CCCD');
      return false;
    }
    if (!formData.reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do trở thành host');
      return false;
    }
    if (!formData.homestayProof.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập chứng minh có homestay');
      return false;
    }
    if (!formData.termsAccepted) {
      Alert.alert('Lỗi', 'Vui lòng đồng ý với điều khoản');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      // Convert date from DD/MM/YYYY to YYYY-MM-DD for backend
      let dateOfBirthForBackend = formData.dateOfBirth.trim();
      if (selectedDate) {
        dateOfBirthForBackend = formatDateForBackend(selectedDate);
      } else if (formData.dateOfBirth.includes('/')) {
        // Try to parse DD/MM/YYYY format
        const parts = formData.dateOfBirth.split('/');
        if (parts.length === 3) {
          dateOfBirthForBackend = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const response = await apiService.createHostRequest({
        fullName: formData.fullName.trim(),
        dateOfBirth: dateOfBirthForBackend,
        address: formData.address.trim(),
        idCardFront: formData.idCardFront,
        idCardBack: formData.idCardBack,
        reason: formData.reason.trim(),
        homestayProof: formData.homestayProof.trim(),
        termsAccepted: formData.termsAccepted,
      });

      if (response.success) {
        Alert.alert(
          'Thành công',
          'Yêu cầu của bạn đã được gửi. Chúng tôi sẽ xem xét và phản hồi trong vòng 3-7 ngày làm việc.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        throw new Error(response.message || 'Gửi yêu cầu thất bại');
      }
    } catch (error: any) {
      console.error('Error submitting host request:', error);
      Alert.alert('Lỗi', error.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Yêu Cầu Trở Thành Host</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formContainer, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <ThemedText style={styles.sectionTitle}>Thông Tin Cá Nhân</ThemedText>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Họ và tên *</ThemedText>
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#11181C', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#94a3b8"
                value={formData.fullName}
                onChangeText={(value) => handleChange('fullName', value)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Ngày sinh *</ThemedText>
              <TouchableOpacity
                style={[styles.input, styles.dateInput, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                onPress={() => setShowDatePicker(true)}
                disabled={isLoading}
              >
                <ThemedText style={[styles.dateInputText, { color: formData.dateOfBirth ? (isDark ? '#fff' : '#11181C') : '#94a3b8' }]}>
                  {formData.dateOfBirth || 'DD/MM/YYYY'}
                </ThemedText>
                <Ionicons name="calendar-outline" size={20} color="#0a7ea4" />
              </TouchableOpacity>
              <ThemedText style={styles.hint}>Nhấn để chọn ngày sinh</ThemedText>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Địa chỉ *</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: isDark ? '#fff' : '#11181C', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                placeholder="Nhập địa chỉ đầy đủ"
                placeholderTextColor="#94a3b8"
                value={formData.address}
                onChangeText={(value) => handleChange('address', value)}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
            </View>

            <ThemedText style={styles.sectionTitle}>Ảnh Căn Cước Công Dân</ThemedText>

            <View style={styles.imagePickerContainer}>
              <ThemedText style={styles.label}>Mặt trước CCCD *</ThemedText>
              {idCardFrontUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: idCardFrontUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={() => showImagePicker('front')}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                    <ThemedText style={styles.changeImageText}>Đổi ảnh</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePickerButton, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => showImagePicker('front')}
                >
                  <Ionicons name="camera" size={32} color="#0a7ea4" />
                  <ThemedText style={styles.imagePickerText}>Chọn ảnh mặt trước</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.imagePickerContainer}>
              <ThemedText style={styles.label}>Mặt sau CCCD *</ThemedText>
              {idCardBackUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: idCardBackUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={() => showImagePicker('back')}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                    <ThemedText style={styles.changeImageText}>Đổi ảnh</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePickerButton, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                  onPress={() => showImagePicker('back')}
                >
                  <Ionicons name="camera" size={32} color="#0a7ea4" />
                  <ThemedText style={styles.imagePickerText}>Chọn ảnh mặt sau</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <ThemedText style={styles.sectionTitle}>Thông Tin Bổ Sung</ThemedText>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Lý do trở thành host *</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: isDark ? '#fff' : '#11181C', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                placeholder="Nhập lý do bạn muốn trở thành host"
                placeholderTextColor="#94a3b8"
                value={formData.reason}
                onChangeText={(value) => handleChange('reason', value)}
                multiline
                numberOfLines={4}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>Chứng minh có homestay *</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: isDark ? '#fff' : '#11181C', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
                placeholder="Ví dụ: Địa chỉ homestay, hình ảnh, giấy tờ pháp lý..."
                placeholderTextColor="#94a3b8"
                value={formData.homestayProof}
                onChangeText={(value) => handleChange('homestayProof', value)}
                multiline
                numberOfLines={4}
                editable={!isLoading}
              />
            </View>

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => handleChange('termsAccepted', !formData.termsAccepted)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    formData.termsAccepted && styles.checkboxChecked,
                    { borderColor: isDark ? '#334155' : '#e2e8f0' },
                  ]}
                >
                  {formData.termsAccepted && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </View>
                <ThemedText style={styles.checkboxLabel}>
                  Tôi đã đọc và đồng ý với{' '}
                  <ThemedText
                    style={styles.linkText}
                    onPress={() => router.push('/host-request-terms')}
                  >
                    điều khoản trở thành host
                  </ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <ThemedText style={styles.submitButtonText}>Gửi Yêu Cầu</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerModal}>
          <TouchableOpacity
            style={styles.datePickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={[styles.datePickerContainer, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.datePickerHeader}>
              <Ionicons name="calendar" size={24} color="#0a7ea4" />
              <ThemedText style={styles.datePickerTitle}>Chọn ngày sinh</ThemedText>
            </View>
            
            {/* Calendar */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.calendarNavButton}
                  onPress={() => changeCalendarMonth('prev')}
                >
                  <Ionicons name="chevron-back" size={20} color="#0a7ea4" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarMonthYearContainer}
                  onPress={() => setShowMonthYearPicker(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.calendarMonthText}>
                    {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={16} color="#0a7ea4" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calendarNavButton}
                  onPress={() => changeCalendarMonth('next')}
                >
                  <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarWeekDays}>
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
                  <View key={index} style={styles.calendarWeekDay}>
                    <ThemedText style={styles.calendarWeekDayText}>{day}</ThemedText>
                  </View>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {getCalendarDays(calendarMonth).map((day, index) => {
                  if (day === null) {
                    return <View key={index} style={styles.calendarDay} />;
                  }

                  const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isToday = date.getTime() === today.getTime();
                  const isFuture = date > today;
                  const isSelected = selectedDate && 
                    date.getDate() === selectedDate.getDate() &&
                    date.getMonth() === selectedDate.getMonth() &&
                    date.getFullYear() === selectedDate.getFullYear();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                        isToday && !isSelected && styles.calendarDayToday,
                        isFuture && styles.calendarDayFuture,
                      ]}
                      onPress={() => {
                        if (!isFuture) {
                          handleDateSelect(day);
                        }
                      }}
                      disabled={isFuture}
                    >
                      <ThemedText
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                          isFuture && styles.calendarDayTextFuture,
                        ]}
                      >
                        {day}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <TouchableOpacity
              style={styles.datePickerCancelButton}
              onPress={() => {
                setShowDatePicker(false);
              }}
            >
              <ThemedText style={styles.datePickerCancelButtonText}>Hủy</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthYearPicker(false)}
      >
        <View style={styles.monthYearPickerModal}>
          <TouchableOpacity
            style={styles.monthYearPickerBackdrop}
            activeOpacity={1}
            onPress={() => setShowMonthYearPicker(false)}
          />
          <View style={[styles.monthYearPickerContainer, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
            <View style={styles.monthYearPickerHeader}>
              <ThemedText style={styles.monthYearPickerTitle}>Chọn tháng và năm</ThemedText>
              <TouchableOpacity
                onPress={() => setShowMonthYearPicker(false)}
                style={styles.monthYearPickerCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Year Selection */}
            <View style={styles.yearSelectionContainer}>
              <ThemedText style={styles.yearSelectionLabel}>Năm</ThemedText>
              <ScrollView
                style={styles.yearScrollView}
                contentContainerStyle={styles.yearScrollContent}
                showsVerticalScrollIndicator={true}
              >
                {Array.from({ length: 100 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const year = currentYear - 80 + i; // Từ 80 năm trước đến 20 năm sau
                  const isSelected = calendarMonth.getFullYear() === year;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearItem,
                        isSelected && styles.yearItemSelected,
                      ]}
                      onPress={() => {
                        const newDate = new Date(calendarMonth);
                        newDate.setFullYear(year);
                        setCalendarMonth(newDate);
                        setShowMonthYearPicker(false);
                      }}
                    >
                      <ThemedText style={[
                        styles.yearItemText,
                        isSelected && styles.yearItemTextSelected,
                      ]}>
                        {year}
                      </ThemedText>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#0a7ea4" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Month Selection */}
            <View style={styles.monthSelectionContainer}>
              <ThemedText style={styles.monthSelectionLabel}>Tháng</ThemedText>
              <View style={styles.monthGrid}>
                {[
                  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
                  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
                  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
                ].map((month, index) => {
                  const monthIndex = index;
                  const isSelected = calendarMonth.getMonth() === monthIndex;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthItem,
                        isSelected && styles.monthItemSelected,
                      ]}
                      onPress={() => {
                        const newDate = new Date(calendarMonth);
                        newDate.setMonth(monthIndex);
                        setCalendarMonth(newDate);
                        setShowMonthYearPicker(false);
                      }}
                    >
                      <ThemedText style={[
                        styles.monthItemText,
                        isSelected && styles.monthItemTextSelected,
                      ]}>
                        {monthIndex + 1}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  placeholder: {
    width: 44,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a7ea4',
    marginBottom: 20,
    marginTop: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  imagePickerContainer: {
    marginBottom: 24,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  linkText: {
    color: '#0a7ea4',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0a7ea4',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 15,
    flex: 1,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarWeekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#0a7ea4',
  },
  calendarDayToday: {
    backgroundColor: '#e0f2fe',
    borderWidth: 2,
    borderColor: '#0a7ea4',
  },
  calendarDayFuture: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#11181C',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextFuture: {
    color: '#94a3b8',
  },
  datePickerCancelButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  datePickerCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  calendarMonthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  monthYearPickerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearPickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  monthYearPickerContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  monthYearPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  monthYearPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
  },
  monthYearPickerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearSelectionContainer: {
    marginBottom: 24,
  },
  yearSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  yearScrollView: {
    maxHeight: 200,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  yearScrollContent: {
    padding: 8,
  },
  yearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  yearItemSelected: {
    backgroundColor: '#e0f2fe',
  },
  yearItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
  },
  yearItemTextSelected: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
  monthSelectionContainer: {
    marginBottom: 12,
  },
  monthSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthItem: {
    width: '22%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthItemSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0a7ea4',
    borderWidth: 2,
  },
  monthItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  monthItemTextSelected: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
});

