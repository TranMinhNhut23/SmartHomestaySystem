import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
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
import { ROOM_TYPES } from '@/types/homestay';

export default function AddHomestayRoomNamesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { formData, updateRoomGroup } = useHomestayForm();

  // Đảm bảo roomNames được khởi tạo đúng khi vào trang
  useEffect(() => {
    if (formData.rooms.length === 0) return;
    
    let needsUpdate = false;
    const updatedRooms = formData.rooms.map((roomGroup) => {
      if (!roomGroup.roomNames || roomGroup.roomNames.length !== roomGroup.quantity) {
        needsUpdate = true;
        const newRoomNames = Array(roomGroup.quantity)
          .fill('')
          .map((_, i) => (roomGroup.roomNames?.[i] || ''));
        return {
          ...roomGroup,
          roomNames: newRoomNames,
        };
      }
      return roomGroup;
    });

    if (needsUpdate) {
      // Cập nhật từng room để đảm bảo state được cập nhật đúng
      updatedRooms.forEach((roomGroup, index) => {
        if (roomGroup.roomNames.length !== formData.rooms[index].roomNames?.length) {
          updateRoomGroup(index, roomGroup);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy một lần khi component mount

  const handleRoomNameChange = (
    roomTypeIndex: number,
    roomIndex: number,
    name: string
  ) => {
    const roomGroup = formData.rooms[roomTypeIndex];
    const newRoomNames = [...roomGroup.roomNames];
    newRoomNames[roomIndex] = name;
    updateRoomGroup(roomTypeIndex, {
      ...roomGroup,
      roomNames: newRoomNames,
    });
  };

  const handleNext = () => {
    // Validate tất cả phòng đều có tên
    for (let i = 0; i < formData.rooms.length; i++) {
      const roomGroup = formData.rooms[i];
      for (let j = 0; j < roomGroup.roomNames.length; j++) {
        if (!roomGroup.roomNames[j] || roomGroup.roomNames[j].trim().length === 0) {
          const roomTypeInfo = ROOM_TYPES.find((rt) => rt.type === roomGroup.type);
          Alert.alert(
            'Lỗi',
            `Vui lòng nhập đầy đủ tên cho tất cả ${roomGroup.quantity} phòng loại ${roomTypeInfo?.label || roomGroup.type}`
          );
          return;
        }
      }
    }

    router.push(`/add-homestay-amenities${id ? `?id=${id}` : ''}` as any);
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
            <ThemedText style={styles.headerSubtitle}>Bước 3/4: Tên phòng</ThemedText>
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
            <Ionicons name="create" size={28} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>Nhập tên từng phòng</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Đặt tên cho từng phòng để dễ dàng quản lý
            </ThemedText>
          </View>

          {formData.rooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                Chưa có phòng nào được chọn. Vui lòng quay lại để chọn loại phòng.
              </ThemedText>
            </View>
          ) : (
            formData.rooms.map((roomGroup, roomTypeIndex) => {
              const roomTypeInfo = ROOM_TYPES.find((rt) => rt.type === roomGroup.type);
              // Đảm bảo roomNames có đủ phần tử
              const roomNames = roomGroup.roomNames || [];
              const displayRoomNames = roomNames.length === roomGroup.quantity 
                ? roomNames 
                : Array(roomGroup.quantity).fill('').map((_, i) => roomNames[i] || '');

              return (
                <View key={roomGroup.type} style={styles.roomTypeSection}>
                  <View style={styles.roomTypeHeader}>
                    <View style={styles.roomTypeIconContainer}>
                      <Ionicons name="bed" size={20} color="#0a7ea4" />
                    </View>
                    <View style={styles.roomTypeHeaderText}>
                      <ThemedText style={styles.roomTypeTitle}>
                        {roomTypeInfo?.label}
                      </ThemedText>
                      <ThemedText style={styles.roomTypeDescription}>
                        {roomTypeInfo?.description}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.roomTypeBadge}>
                    <Ionicons name="home" size={14} color="#0a7ea4" />
                    <ThemedText style={styles.roomTypeSubtitle}>
                      {roomGroup.quantity} phòng
                    </ThemedText>
                  </View>

                  {displayRoomNames.map((roomName, roomIndex) => (
                    <View key={roomIndex} style={styles.inputContainer}>
                      <View style={styles.inputLabelContainer}>
                        <View style={styles.roomNumberBadge}>
                          <ThemedText style={styles.roomNumberText}>
                            {roomIndex + 1}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.inputLabel}>
                          Tên phòng {roomIndex + 1}
                        </ThemedText>
                      </View>
                      <TextInput
                        style={[styles.input, { backgroundColor: '#fff', color: '#000' }]}
                        placeholder={`Ví dụ: Phòng ${roomTypeInfo?.label} ${roomIndex + 1}`}
                        placeholderTextColor="#999"
                        value={roomName || ''}
                        onChangeText={(text) =>
                          handleRoomNameChange(roomTypeIndex, roomIndex, text)
                        }
                      />
                    </View>
                  ))}
                </View>
              );
            })
          )}

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
  emptyContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  roomTypeSection: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roomTypeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  roomTypeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomTypeHeaderText: {
    flex: 1,
  },
  roomTypeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    color: '#11181C',
  },
  roomTypeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  roomTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    marginBottom: 20,
  },
  roomTypeSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  roomNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 52,
    backgroundColor: '#fafbfc',
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

