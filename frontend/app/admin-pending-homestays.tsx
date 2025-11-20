import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getAvatarUrl } from '@/services/api';
import { ROOM_TYPES } from '@/types/homestay';

interface Homestay {
  _id: string;
  name: string;
  description: string;
  address: {
    province: { name: string };
    district: { name: string };
    ward: { name: string };
    street: string;
  };
  pricePerNight: number;
  images: string[];
  status: string;
  featured: boolean;
  rooms?: Array<{
    _id: string;
    type: string;
    name: string;
    pricePerNight: number;
    maxGuests?: number;
    status: string;
  }>;
  amenities?: string[];
  createdAt: string;
  updatedAt?: string;
  host?: {
    username: string;
    email: string;
    avatar?: string;
  };
}

export default function AdminPendingHomestaysScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [homestayIdToReject, setHomestayIdToReject] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (user?.roleName !== 'admin') {
      Alert.alert('Không có quyền', 'Chỉ admin mới có thể truy cập màn hình này', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    loadPendingHomestays();
  }, [isAuthenticated, user]);

  const loadPendingHomestays = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getPendingHomestays();
      if (response.success && response.data) {
        setHomestays(response.data);
      } else {
        throw new Error(response.message || 'Không thể tải danh sách homestay');
      }
    } catch (error: any) {
      console.error('Error loading pending homestays:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách homestay');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingHomestays();
  };

  const handleApprove = async (id: string) => {
    Alert.alert(
      'Xác nhận duyệt',
      'Bạn có chắc chắn muốn duyệt homestay này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt',
          style: 'default',
          onPress: async () => {
            try {
              setApprovingId(id);
              const response = await apiService.approveHomestay(id);
              if (response.success) {
                Alert.alert('Thành công', 'Đã duyệt homestay thành công');
                loadPendingHomestays();
              } else {
                throw new Error(response.message || 'Duyệt homestay thất bại');
              }
            } catch (error: any) {
              console.error('Error approving homestay:', error);
              Alert.alert('Lỗi', error.message || 'Không thể duyệt homestay');
            } finally {
              setApprovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    setHomestayIdToReject(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!homestayIdToReject) return;

    try {
      setRejectingId(homestayIdToReject);
      setShowRejectModal(false);
      const response = await apiService.rejectHomestay(homestayIdToReject, rejectReason.trim() || undefined);
      if (response.success) {
        Alert.alert('Thành công', 'Đã từ chối homestay');
        loadPendingHomestays();
      } else {
        throw new Error(response.message || 'Từ chối homestay thất bại');
      }
    } catch (error: any) {
      console.error('Error rejecting homestay:', error);
      Alert.alert('Lỗi', error.message || 'Không thể từ chối homestay');
    } finally {
      setRejectingId(null);
      setHomestayIdToReject(null);
      setRejectReason('');
    }
  };

  const cancelReject = () => {
    setShowRejectModal(false);
    setRejectReason('');
    setHomestayIdToReject(null);
  };

  const getFullAddress = (homestay: Homestay) => {
    const { street, ward, district, province } = homestay.address;
    return `${street}, ${ward.name}, ${district.name}, ${province.name}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoomTypeLabel = (type: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.type === type);
    return roomType?.label || type;
  };

  const getRoomTypeGroups = (rooms: Homestay['rooms']) => {
    if (!rooms || rooms.length === 0) return [];
    const groups: { [key: string]: { type: string; label: string; count: number; prices: number[] } } = {};
    rooms.forEach((room) => {
      if (!groups[room.type]) {
        groups[room.type] = {
          type: room.type,
          label: getRoomTypeLabel(room.type),
          count: 0,
          prices: [],
        };
      }
      groups[room.type].count++;
      groups[room.type].prices.push(room.pricePerNight);
    });
    // Tính giá min/max và sắp xếp theo giá tăng dần
    return Object.values(groups)
      .map((group) => ({
        ...group,
        minPrice: Math.min(...group.prices),
        maxPrice: Math.max(...group.prices),
      }))
      .sort((a, b) => a.minPrice - b.minPrice);
  };

  const groupHomestaysByHost = () => {
    const grouped: { [key: string]: Homestay[] } = {};
    homestays.forEach((homestay) => {
      const hostKey = homestay.host?.email || homestay.host?.username || 'unknown';
      if (!grouped[hostKey]) {
        grouped[hostKey] = [];
      }
      grouped[hostKey].push(homestay);
    });
    return grouped;
  };

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
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
        <ThemedText style={styles.headerTitle}>Duyệt Homestay</ThemedText>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a7ea4" />
        }
      >
        {homestays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#9ca3af" />
            <ThemedText style={styles.emptyText}>Không có homestay nào đang chờ duyệt</ThemedText>
          </View>
        ) : (
          Object.entries(groupHomestaysByHost()).map(([hostKey, hostHomestays]) => {
            const host = hostHomestays[0]?.host;
            return (
              <View key={hostKey} style={styles.hostGroup}>
                {/* Host Header */}
                <View style={styles.hostGroupHeader}>
                  <View style={styles.hostGroupHeaderLeft}>
                    <View style={styles.hostAvatarContainer}>
                      {host?.avatar ? (
                        <Image
                          source={{ uri: getAvatarUrl(host.avatar) || '' }}
                          style={styles.hostAvatar}
                        />
                      ) : (
                        <Ionicons name="person" size={20} color="#0a7ea4" />
                      )}
                    </View>
                    <View style={styles.hostGroupInfo}>
                      <ThemedText style={styles.hostGroupName}>
                        {host?.username || 'Chưa có tên'}
                      </ThemedText>
                      <ThemedText style={styles.hostGroupEmail}>
                        {host?.email || 'N/A'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.hostGroupBadge}>
                    <ThemedText style={styles.hostGroupBadgeText}>
                      {hostHomestays.length} homestay
                    </ThemedText>
                  </View>
                </View>

                {/* Homestays của host này */}
                {hostHomestays.map((homestay) => (
            <View key={homestay._id} style={styles.homestayCard}>
              <TouchableOpacity
                style={styles.homestayContent}
                onPress={() => router.push(`/homestay-detail?id=${homestay._id}` as any)}
                activeOpacity={0.7}
              >
                <View style={styles.homestayHeader}>
                  <View style={styles.homestayHeaderLeft}>
                    <ThemedText style={styles.homestayName}>{homestay.name}</ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
                      <ThemedText style={styles.statusText}>Chờ duyệt</ThemedText>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>

                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <ThemedText style={styles.addressText} numberOfLines={2}>
                    {getFullAddress(homestay)}
                  </ThemedText>
                </View>

                <ThemedText style={styles.descriptionText} numberOfLines={3}>
                  {homestay.description}
                </ThemedText>

                {/* Rooms Detail */}
                {homestay.rooms && homestay.rooms.length > 0 && (
                  <View style={styles.roomsSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="bed-outline" size={18} color="#0a7ea4" />
                      <ThemedText style={styles.sectionTitle}>Phòng ({homestay.rooms.length})</ThemedText>
                    </View>
                    {getRoomTypeGroups(homestay.rooms).map((group, idx) => (
                      <View key={idx} style={styles.roomTypeItem}>
                        <View style={styles.roomTypeInfo}>
                          <ThemedText style={styles.roomTypeLabel}>{group.label}</ThemedText>
                          <ThemedText style={styles.roomTypeCount}>{group.count} phòng</ThemedText>
                        </View>
                        <ThemedText style={styles.roomTypePrice}>
                          {group.minPrice === group.maxPrice
                            ? `${group.minPrice.toLocaleString('vi-VN')}đ/đêm`
                            : `${group.minPrice.toLocaleString('vi-VN')} - ${group.maxPrice.toLocaleString('vi-VN')}đ/đêm`}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                {/* Amenities */}
                {homestay.amenities && homestay.amenities.length > 0 && (
                  <View style={styles.amenitiesSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="sparkles-outline" size={18} color="#0a7ea4" />
                      <ThemedText style={styles.sectionTitle}>Tiện ích ({homestay.amenities.length})</ThemedText>
                    </View>
                    <View style={styles.amenitiesList}>
                      {homestay.amenities.slice(0, 5).map((amenity, idx) => (
                        <View key={idx} style={styles.amenityTag}>
                          <ThemedText style={styles.amenityText}>{amenity}</ThemedText>
                        </View>
                      ))}
                      {homestay.amenities.length > 5 && (
                        <View style={styles.amenityTag}>
                          <ThemedText style={styles.amenityText}>+{homestay.amenities.length - 5} khác</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Created Date */}
                <View style={styles.dateInfo}>
                  <Ionicons name="time-outline" size={14} color="#94a3b8" />
                  <ThemedText style={styles.dateText}>
                    Đăng tải: {formatDate(homestay.createdAt)}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.rejectButton, rejectingId === homestay._id && styles.buttonDisabled]}
                  onPress={() => handleReject(homestay._id)}
                  disabled={rejectingId === homestay._id || approvingId === homestay._id}
                >
                  {rejectingId === homestay._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={20} color="#fff" />
                      <ThemedText style={styles.rejectButtonText}>Từ chối</ThemedText>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approveButton, approvingId === homestay._id && styles.buttonDisabled]}
                  onPress={() => handleApprove(homestay._id)}
                  disabled={approvingId === homestay._id || rejectingId === homestay._id}
                >
                  {approvingId === homestay._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <ThemedText style={styles.approveButtonText}>Duyệt</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal nhập lý do từ chối */}
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelReject}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
              <ThemedText style={[styles.modalTitle, { color: isDark ? '#fff' : '#11181C' }]}>
                Từ chối homestay
              </ThemedText>
              <ThemedText style={[styles.modalSubtitle, { color: isDark ? '#9ca3af' : '#666' }]}>
                Vui lòng nhập lý do từ chối (tùy chọn):
              </ThemedText>
              
              <TextInput
                style={[
                  styles.reasonInput,
                  {
                    backgroundColor: isDark ? '#374151' : '#f3f4f6',
                    color: isDark ? '#fff' : '#11181C',
                    borderColor: isDark ? '#4b5563' : '#d1d5db',
                  },
                ]}
                placeholder="Nhập lý do từ chối..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!rejectingId}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: isDark ? '#4b5563' : '#d1d5db' }]}
                  onPress={cancelReject}
                  disabled={!!rejectingId}
                >
                  <ThemedText style={[styles.modalCancelText, { color: isDark ? '#fff' : '#11181C' }]}>
                    Hủy
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    rejectingId && styles.buttonDisabled,
                  ]}
                  onPress={confirmReject}
                  disabled={!!rejectingId}
                >
                  {rejectingId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={styles.modalConfirmText}>Từ chối</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  hostGroup: {
    marginBottom: 24,
  },
  hostGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
  },
  hostGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  hostAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0a7ea4',
    overflow: 'hidden',
  },
  hostAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  hostGroupInfo: {
    flex: 1,
  },
  hostGroupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 4,
  },
  hostGroupEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  hostGroupBadge: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hostGroupBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  homestayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  homestayContent: {
    padding: 16,
  },
  homestayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  homestayHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  homestayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  hostText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  roomsSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
  },
  roomTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomTypeInfo: {
    flex: 1,
  },
  roomTypeLabel: {
    fontSize: 15,
    color: '#11181C',
    fontWeight: '600',
    marginBottom: 2,
  },
  roomTypeCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  roomTypePrice: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '700',
    textAlign: 'right',
  },
  amenitiesSection: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  amenityText: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '500',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

