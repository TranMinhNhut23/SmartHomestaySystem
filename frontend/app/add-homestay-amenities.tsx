import React, { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  View,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHomestayForm } from '@/contexts/HomestayFormContext';
import { apiService } from '@/services/api';
import AmenityCheckbox from '@/components/homestay/AmenityCheckbox';
import { AMENITIES } from '@/types/homestay';
import { normalizeAmenitiesToDB } from '@/utils/homestayValidation';

export default function AddHomestayAmenitiesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!id;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const { formData, toggleAmenity, validateFormFull, resetForm } = useHomestayForm();

  const handleSubmit = async () => {
    const validation = validateFormFull();
    if (!validation.isValid) {
      Alert.alert('Lỗi', validation.error);
      return;
    }

    setIsLoading(true);
    try {
      const homestayData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        address: formData.address,
        googleMapsEmbed: formData.googleMapsEmbed.trim() || undefined,
        pricePerNight: parseFloat(formData.pricePerNight) || 0,
        images: formData.images,
        featured: formData.featured,
        requireDeposit: formData.requireDeposit,
        rooms: formData.rooms.map((room) => ({
          type: room.type,
          quantity: room.quantity,
          pricePerNight: room.pricePerNight,
          roomNames: room.roomNames.map((name) => name.trim()),
        })),
        amenities: normalizeAmenitiesToDB(formData.amenities), // Normalize về lowercase cho DB
      };

      console.log('Sending homestay data:', JSON.stringify(homestayData, null, 2));
      console.log('Rooms data:', JSON.stringify(homestayData.rooms, null, 2));

      let response;
      if (isEditMode && id) {
        response = await apiService.updateHomestay(id, homestayData);
      } else {
        response = await apiService.createHomestay(homestayData);
      }

      if (response.success) {
        if (!isEditMode) {
          resetForm(); // Reset form sau khi tạo thành công
        }
        Alert.alert(
          'Thành công',
          isEditMode ? 'Cập nhật homestay thành công!' : 'Tạo homestay thành công!',
          [
            {
              text: 'OK',
              onPress: () => {
                if (isEditMode) {
                  router.replace(`/homestay-detail?id=${id}`);
                } else {
                  router.replace('/(tabs)');
                }
              },
            },
          ]
        );
      } else {
        throw new Error(response.message || (isEditMode ? 'Cập nhật homestay thất bại' : 'Tạo homestay thất bại'));
      }
    } catch (error: any) {
      console.error('Error creating homestay:', error);
      Alert.alert('Lỗi', error.message || 'Tạo homestay thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // Chia amenities thành 3 cột
  const itemsPerColumn = Math.ceil(AMENITIES.length / 3);
  const column1 = AMENITIES.slice(0, itemsPerColumn);
  const column2 = AMENITIES.slice(itemsPerColumn, itemsPerColumn * 2);
  const column3 = AMENITIES.slice(itemsPerColumn * 2);

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
            <ThemedText style={styles.headerSubtitle}>Bước 4/4: Tiện nghi</ThemedText>
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
          <View style={styles.titleContainer}>
            <Ionicons name="sparkles" size={28} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>Tiện nghi</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Chọn các tiện nghi có sẵn tại homestay của bạn
            </ThemedText>
          </View>

          <View style={styles.amenitiesContainer}>
            <View style={styles.column}>
              {column1.map((amenity) => (
                <AmenityCheckbox
                  key={amenity}
                  label={amenity}
                  isChecked={formData.amenities.includes(amenity)}
                  onToggle={() => toggleAmenity(amenity)}
                  disabled={isLoading}
                />
              ))}
            </View>
            <View style={styles.column}>
              {column2.map((amenity) => (
                <AmenityCheckbox
                  key={amenity}
                  label={amenity}
                  isChecked={formData.amenities.includes(amenity)}
                  onToggle={() => toggleAmenity(amenity)}
                  disabled={isLoading}
                />
              ))}
            </View>
            <View style={styles.column}>
              {column3.map((amenity) => (
                <AmenityCheckbox
                  key={amenity}
                  label={amenity}
                  isChecked={formData.amenities.includes(amenity)}
                  onToggle={() => toggleAmenity(amenity)}
                  disabled={isLoading}
                />
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton2}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={20} color="#666" />
              <ThemedText style={styles.backButtonText}>Quay lại</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#0a7ea4', '#0d8bb8']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>
                    {isEditMode ? 'Cập nhật' : 'Hoàn tất'}
                  </ThemedText>
                )}
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
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    color: '#11181C',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
    fontWeight: '500',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  column: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  backButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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

