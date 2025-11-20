import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  View,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHomestayForm } from '@/contexts/HomestayFormContext';
import RoomTypeCard from '@/components/homestay/RoomTypeCard';
import { ROOM_TYPES, RoomType, RoomGroup } from '@/types/homestay';

export default function AddHomestayRoomsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { formData, updateRoomGroup, addRoomGroup, removeRoomGroup } = useHomestayForm();

  const handleToggleRoomType = (roomType: RoomType) => {
    const existingIndex = formData.rooms.findIndex((r) => r.type === roomType);

    if (existingIndex >= 0) {
      // Nếu đã có, xóa nó
      removeRoomGroup(existingIndex);
    } else {
      // Nếu chưa có, thêm mới
      const newRoomGroup: RoomGroup = {
        type: roomType,
        quantity: 1,
        pricePerNight: 0,
        roomNames: [''],
      };
      addRoomGroup(newRoomGroup);
    }
  };

  const handleQuantityChange = (roomType: RoomType, quantity: number) => {
    const index = formData.rooms.findIndex((r) => r.type === roomType);
    if (index >= 0) {
      const roomGroup = formData.rooms[index];
      const existingNames = roomGroup.roomNames || [];
      updateRoomGroup(index, {
        ...roomGroup,
        quantity,
        roomNames: Array(quantity)
          .fill('')
          .map((_, i) => (i < existingNames.length ? existingNames[i] : '')),
      });
    }
  };

  const handlePriceChange = (roomType: RoomType, price: number) => {
    const index = formData.rooms.findIndex((r) => r.type === roomType);
    if (index >= 0) {
      updateRoomGroup(index, { pricePerNight: price });
    }
  };

  const handleNext = () => {
    if (formData.rooms.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một loại phòng');
      return;
    }

    // Validate rooms
    for (const room of formData.rooms) {
      if (room.quantity < 1) {
        Alert.alert('Lỗi', 'Số lượng phòng phải lớn hơn 0');
        return;
      }
      if (room.pricePerNight <= 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập giá mỗi đêm cho tất cả các loại phòng');
        return;
      }
    }

    router.push(`/add-homestay-room-names${id ? `?id=${id}` : ''}` as any);
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
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Thêm Homestay Mới</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Bước 2/4: Loại phòng</ThemedText>
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
            <Ionicons name="bed" size={28} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>Loại phòng</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Chọn loại phòng và nhập số lượng, giá cho từng loại
            </ThemedText>
          </View>

          {ROOM_TYPES.map((roomType) => {
            const roomGroup = formData.rooms.find((r) => r.type === roomType.type);
            const isSelected = !!roomGroup;

            return (
              <RoomTypeCard
                key={roomType.type}
                roomType={roomType}
                isSelected={isSelected}
                roomGroup={roomGroup}
                onToggle={() => handleToggleRoomType(roomType.type)}
                onQuantityChange={(quantity) =>
                  handleQuantityChange(roomType.type, quantity)
                }
                onPriceChange={(price) => handlePriceChange(roomType.type, price)}
              />
            );
          })}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.backButton2}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#666" />
              <ThemedText style={styles.backButtonText}>Quay lại</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleNext}
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
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
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
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

