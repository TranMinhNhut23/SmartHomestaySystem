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
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getAvatarUrl, getIdCardImageUrl } from '@/services/api';

interface HostRequest {
  _id: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  fullName: string;
  dateOfBirth: string;
  address: string;
  idCardFront: string;
  idCardBack: string;
  reason: string;
  homestayProof: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string;
  reviewedBy?: {
    username: string;
  };
  reviewedAt?: string;
  createdAt: string;
}

export default function AdminHostRequestsScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [requests, setRequests] = useState<HostRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<HostRequest | null>(null);

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

    loadHostRequests();
  }, [isAuthenticated, user, statusFilter]);

  const loadHostRequests = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllHostRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      
      if (response.success && response.data) {
        setRequests(response.data.requests || response.data || []);
      } else {
        throw new Error(response.message || 'Không thể tải danh sách yêu cầu');
      }
    } catch (error: any) {
      console.error('Error loading host requests:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách yêu cầu');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHostRequests();
  };

  const handleApprove = async (requestId: string) => {
    try {
      setApprovingId(requestId);
      const response = await apiService.approveHostRequest(requestId);
      if (response.success) {
        Alert.alert('Thành công', 'Đã duyệt yêu cầu trở thành host');
        loadHostRequests();
      } else {
        throw new Error(response.message || 'Không thể duyệt yêu cầu');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể duyệt yêu cầu');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    
    if (!rejectReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
      return;
    }

    const reject = async () => {
      try {
        setRejectingId(selectedRequest._id);
        const response = await apiService.rejectHostRequest(selectedRequest._id, rejectReason);
        if (response.success) {
          Alert.alert('Thành công', 'Đã từ chối yêu cầu');
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedRequest(null);
          loadHostRequests();
        } else {
          throw new Error(response.message || 'Không thể từ chối yêu cầu');
        }
      } catch (error: any) {
        Alert.alert('Lỗi', error.message || 'Không thể từ chối yêu cầu');
      } finally {
        setRejectingId(null);
      }
    };

    reject();
  };

  const openRejectModal = (request: HostRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Đã Duyệt';
      case 'rejected':
        return 'Đã Từ Chối';
      default:
        return 'Chờ Duyệt';
    }
  };

  if (isLoading && requests.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Phê Duyệt Yêu Cầu Host</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Phê Duyệt Yêu Cầu Host</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              statusFilter === status && styles.filterTabActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <ThemedText
              style={[
                styles.filterText,
                statusFilter === status && styles.filterTextActive,
              ]}
            >
              {status === 'all' ? 'Tất Cả' : getStatusLabel(status)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <ThemedText style={styles.emptyText}>Không có yêu cầu nào</ThemedText>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request._id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.userInfo}>
                  {request.userId.avatar ? (
                    <Image
                      source={{ uri: getAvatarUrl(request.userId.avatar) || '' }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={24} color="#999" />
                    </View>
                  )}
                  <View>
                    <ThemedText style={styles.username}>{request.userId.username}</ThemedText>
                    <ThemedText style={styles.email}>{request.userId.email}</ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(request.status) + '20' },
                  ]}
                >
                  <ThemedText
                    style={[styles.statusText, { color: getStatusColor(request.status) }]}
                  >
                    {getStatusLabel(request.status)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Họ và tên:</ThemedText>
                  <ThemedText style={styles.detailValue}>{request.fullName}</ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Ngày sinh:</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {new Date(request.dateOfBirth).toLocaleDateString('vi-VN')}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Địa chỉ:</ThemedText>
                  <ThemedText style={styles.detailValue}>{request.address}</ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Lý do:</ThemedText>
                  <ThemedText style={styles.detailValue}>{request.reason}</ThemedText>
                </View>
                {request.rejectedReason && (
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Lý do từ chối:</ThemedText>
                    <ThemedText style={[styles.detailValue, styles.rejectedReason]}>
                      {request.rejectedReason}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* ID Card Images */}
              <View style={styles.idCardContainer}>
                <View style={styles.idCardItem}>
                  <ThemedText style={styles.idCardLabel}>Mặt trước CCCD</ThemedText>
                  <Image
                    source={{ uri: getIdCardImageUrl(request.idCardFront) || '' }}
                    style={styles.idCardImage}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.idCardItem}>
                  <ThemedText style={styles.idCardLabel}>Mặt sau CCCD</ThemedText>
                  <Image
                    source={{ uri: getIdCardImageUrl(request.idCardBack) || '' }}
                    style={styles.idCardImage}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* Actions */}
              {request.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(request._id)}
                    disabled={approvingId === request._id}
                  >
                    {approvingId === request._id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <ThemedText style={styles.actionButtonText}>Duyệt</ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => openRejectModal(request)}
                    disabled={rejectingId === request._id}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <ThemedText style={styles.actionButtonText}>Từ Chối</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
          setSelectedRequest(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Từ Chối Yêu Cầu</ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedRequest(null);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.modalSubtitle}>
              Vui lòng nhập lý do từ chối yêu cầu này
            </ThemedText>
            <TextInput
              style={styles.reasonInput}
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedRequest(null);
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={handleReject}
                disabled={rejectingId !== null}
              >
                {rejectingId ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.confirmButtonText}>Từ Chối</ThemedText>
                )}
              </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#8b5cf6',
    borderBottomWidth: 0,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  filterTabActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  filterText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  email: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
    fontWeight: '500',
  },
  rejectedReason: {
    color: '#ef4444',
  },
  idCardContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  idCardItem: {
    flex: 1,
  },
  idCardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  idCardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmRejectButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
