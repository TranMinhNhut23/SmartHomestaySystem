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
import { apiService, getAvatarUrl } from '@/services/api';

interface Complaint {
  _id: string;
  user: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  type: 'homestay' | 'booking' | 'payment' | 'service' | 'host' | 'other';
  title: string;
  content: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  adminResponse?: {
    response: string;
    respondedBy: {
      username: string;
    };
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS = {
  homestay: 'Homestay',
  booking: 'Đặt phòng',
  payment: 'Thanh toán',
  service: 'Dịch vụ',
  host: 'Chủ nhà',
  other: 'Khác',
};

export default function AdminComplaintsScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'rejected'>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'in_progress' | 'resolved' | 'rejected'>('in_progress');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
  });

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

    loadComplaints();
  }, [isAuthenticated, user, statusFilter]);

  const loadComplaints = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllComplaints({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      if (response.success && response.data) {
        setComplaints(response.data.complaints || response.data || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      } else {
        throw new Error(response.message || 'Không thể tải danh sách khiếu nại');
      }
    } catch (error: any) {
      console.error('Error loading complaints:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách khiếu nại');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadComplaints();
  };

  const handleSubmitResponse = async () => {
    if (!selectedComplaint) return;

    if (!responseText.trim() && selectedStatus !== 'rejected') {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung phản hồi');
      return;
    }

    if (selectedStatus === 'rejected' && !responseText.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setProcessingId(selectedComplaint._id);
      const response = await apiService.updateComplaintStatus(
        selectedComplaint._id,
        selectedStatus,
        responseText.trim() || undefined
      );

      if (response.success) {
        Alert.alert(
          'Thành công',
          `Đã cập nhật trạng thái khiếu nại. Email đã được gửi tới khách hàng.`,
          [{ text: 'OK', onPress: () => {
            setShowResponseModal(false);
            setResponseText('');
            setSelectedComplaint(null);
            loadComplaints();
          }}]
        );
      } else {
        throw new Error(response.message || 'Không thể cập nhật khiếu nại');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật khiếu nại');
    } finally {
      setProcessingId(null);
    }
  };

  const openResponseModal = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setSelectedStatus(
      complaint.status === 'pending' ? 'in_progress' :
      complaint.status === 'in_progress' ? 'resolved' :
      complaint.status as 'in_progress' | 'resolved' | 'rejected'
    );
    setResponseText(complaint.adminResponse?.response || '');
    setShowResponseModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'in_progress':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'Đã giải quyết';
      case 'rejected':
        return 'Đã từ chối';
      case 'in_progress':
        return 'Đang xử lý';
      default:
        return 'Chờ xử lý';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Khẩn cấp';
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      default:
        return 'Thấp';
    }
  };

  if (isLoading && complaints.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Duyệt Khiếu Nại</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle}>Duyệt Khiếu Nại</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {stats.pending > 0 ? `${stats.pending} khiếu nại chờ xử lý` : 'Tất cả đã được xử lý'}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <ThemedText style={[styles.statValue, { color: '#6b7280' }]}>{stats.pending}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: isDark ? '#8E8E93' : '#6b7280' }]}>Chờ xử lý</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <ThemedText style={[styles.statValue, { color: '#f59e0b' }]}>{stats.in_progress}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: isDark ? '#8E8E93' : '#6b7280' }]}>Đang xử lý</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <ThemedText style={[styles.statValue, { color: '#10b981' }]}>{stats.resolved}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: isDark ? '#8E8E93' : '#6b7280' }]}>Đã giải quyết</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <ThemedText style={[styles.statValue, { color: '#ef4444' }]}>{stats.rejected}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: isDark ? '#8E8E93' : '#6b7280' }]}>Đã từ chối</ThemedText>
        </View>
      </ScrollView>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
        {(['all', 'pending', 'in_progress', 'resolved', 'rejected'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              statusFilter === status && styles.filterTabActive,
              {
                backgroundColor:
                  statusFilter === status
                    ? '#ef4444'
                    : isDark
                    ? '#2C2C2E'
                    : '#f0f0f0',
                borderColor:
                  statusFilter === status
                    ? '#dc2626'
                    : isDark
                    ? '#2C2C2E'
                    : '#e5e7eb',
              },
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <ThemedText
              style={[
                styles.filterText,
                {
                  color:
                    statusFilter === status
                      ? '#fff'
                      : isDark
                      ? '#fff'
                      : '#555',
                  fontWeight: statusFilter === status ? '700' : '600',
                },
              ]}
              numberOfLines={2}
            >
              {status === 'all' ? 'Tất Cả' : getStatusLabel(status)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {complaints.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={isDark ? '#8E8E93' : '#ccc'} />
            <ThemedText style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#999' }]}>
              Không có khiếu nại nào
            </ThemedText>
          </View>
        ) : (
          complaints.map((complaint) => (
            <TouchableOpacity
              key={complaint._id}
              style={[styles.complaintCard, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}
              onPress={() => openResponseModal(complaint)}
              activeOpacity={0.7}
            >
              <View style={styles.complaintHeader}>
                <View style={styles.userInfo}>
                  {complaint.user?.avatar ? (
                    <Image
                      source={{ uri: getAvatarUrl(complaint.user.avatar) || '' }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' }]}>
                      <Ionicons name="person" size={24} color={isDark ? '#8E8E93' : '#999'} />
                    </View>
                  )}
                  <View style={styles.userInfoText}>
                    <ThemedText style={[styles.username, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                      {complaint.user?.username || 'N/A'}
                    </ThemedText>
                    <ThemedText style={[styles.email, { color: isDark ? '#8E8E93' : '#555' }]}>
                      {complaint.user?.email || 'N/A'}
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(complaint.status) + '20' },
                  ]}
                >
                  <ThemedText
                    style={[styles.statusText, { color: getStatusColor(complaint.status) }]}
                  >
                    {getStatusLabel(complaint.status)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.complaintContent}>
                <View style={styles.typePriorityRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0' },
                    ]}
                  >
                    <Ionicons
                      name={
                        complaint.type === 'homestay' ? 'home-outline' :
                        complaint.type === 'booking' ? 'calendar-outline' :
                        complaint.type === 'payment' ? 'card-outline' :
                        complaint.type === 'service' ? 'build-outline' :
                        complaint.type === 'host' ? 'person-outline' : 'ellipse-outline'
                      }
                      size={14}
                      color={isDark ? '#8E8E93' : '#666'}
                    />
                    <ThemedText style={[styles.typeText, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {TYPE_LABELS[complaint.type]}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: getPriorityColor(complaint.priority) + '20' },
                    ]}
                  >
                    <ThemedText
                      style={[styles.priorityText, { color: getPriorityColor(complaint.priority) }]}
                    >
                      {getPriorityLabel(complaint.priority)}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={[styles.complaintTitle, { color: isDark ? '#fff' : '#1a1a1a' }]}>
                  {complaint.title}
                </ThemedText>
                <ThemedText
                  style={[styles.complaintContentText, { color: isDark ? '#8E8E93' : '#666' }]}
                  numberOfLines={3}
                >
                  {complaint.content}
                </ThemedText>

                {complaint.adminResponse?.response && (
                  <View style={[styles.responsePreview, { backgroundColor: isDark ? '#2C2C2E' : '#f0f9ff', borderLeftColor: '#0a7ea4' }]}>
                    <ThemedText style={[styles.responsePreviewLabel, { color: '#0a7ea4' }]}>
                      Phản hồi từ admin:
                    </ThemedText>
                    <ThemedText
                      style={[styles.responsePreviewText, { color: isDark ? '#fff' : '#374151' }]}
                      numberOfLines={2}
                    >
                      {complaint.adminResponse.response}
                    </ThemedText>
                  </View>
                )}

                <View style={styles.complaintFooter}>
                  <ThemedText style={[styles.dateText, { color: isDark ? '#8E8E93' : '#999' }]}>
                    {new Date(complaint.createdAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#8E8E93' : '#999'} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowResponseModal(false);
          setResponseText('');
          setSelectedComplaint(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
            {selectedComplaint && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <ThemedText style={[styles.modalTitle, { color: isDark ? '#fff' : '#111' }]}>
                      Xử Lý Khiếu Nại
                    </ThemedText>
                    <ThemedText style={[styles.modalSubtitle, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {selectedComplaint.title}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                      setSelectedComplaint(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color={isDark ? '#8E8E93' : '#666'} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Complaint Details */}
                  <View style={[styles.complaintDetailBox, { backgroundColor: isDark ? '#2C2C2E' : '#f8fafc' }]}>
                    <ThemedText style={[styles.detailSectionTitle, { color: isDark ? '#fff' : '#111' }]}>
                      Nội dung khiếu nại:
                    </ThemedText>
                    <ThemedText style={[styles.detailText, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {selectedComplaint.content}
                    </ThemedText>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                        Loại:
                      </ThemedText>
                      <ThemedText style={[styles.detailValue, { color: isDark ? '#fff' : '#111' }]}>
                        {TYPE_LABELS[selectedComplaint.type]}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                        Mức độ:
                      </ThemedText>
                      <ThemedText style={[styles.detailValue, { color: getPriorityColor(selectedComplaint.priority) }]}>
                        {getPriorityLabel(selectedComplaint.priority)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText style={[styles.detailLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                        Khách hàng:
                      </ThemedText>
                      <ThemedText style={[styles.detailValue, { color: isDark ? '#fff' : '#111' }]}>
                        {selectedComplaint.user?.username} ({selectedComplaint.user?.email})
                      </ThemedText>
                    </View>
                  </View>

                  {/* Status Selection */}
                  <View style={styles.statusSelectionContainer}>
                    <ThemedText style={[styles.modalLabel, { color: isDark ? '#fff' : '#111' }]}>
                      Cập nhật trạng thái <ThemedText style={{ color: '#ef4444' }}>*</ThemedText>
                    </ThemedText>
                    <View style={styles.statusButtons}>
                      {(['in_progress', 'resolved', 'rejected'] as const).map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusButton,
                            {
                              backgroundColor:
                                selectedStatus === status
                                  ? getStatusColor(status)
                                  : isDark
                                  ? '#2C2C2E'
                                  : '#f0f0f0',
                              borderColor:
                                selectedStatus === status
                                  ? getStatusColor(status)
                                  : isDark
                                  ? '#3C3C3E'
                                  : '#e5e7eb',
                              borderWidth: selectedStatus === status ? 2.5 : 1.5,
                              shadowColor: selectedStatus === status ? getStatusColor(status) : 'transparent',
                              shadowOffset: { width: 0, height: selectedStatus === status ? 2 : 0 },
                              shadowOpacity: selectedStatus === status ? 0.3 : 0,
                              shadowRadius: selectedStatus === status ? 4 : 0,
                              elevation: selectedStatus === status ? 3 : 0,
                            },
                          ]}
                          onPress={() => setSelectedStatus(status)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.statusButtonContent}>
                            <ThemedText
                              style={[
                                styles.statusButtonText,
                                {
                                  color:
                                    selectedStatus === status
                                      ? '#fff'
                                      : isDark
                                      ? '#8E8E93'
                                      : '#666',
                                  fontWeight: selectedStatus === status ? '700' : '500',
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {getStatusLabel(status)}
                            </ThemedText>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Response Input */}
                  <View style={styles.responseInputContainer}>
                    <ThemedText style={[styles.modalLabel, { color: isDark ? '#fff' : '#111' }]}>
                      Nội dung phản hồi{' '}
                      {selectedStatus === 'rejected' && <ThemedText style={{ color: '#ef4444' }}>*</ThemedText>}
                      <ThemedText style={[styles.modalHint, { color: isDark ? '#8E8E93' : '#666' }]}>
                        {' '}(Email sẽ được gửi tự động tới khách hàng)
                      </ThemedText>
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.responseInput,
                        {
                          backgroundColor: isDark ? '#2C2C2E' : '#f8fafc',
                          color: isDark ? '#fff' : '#111',
                          borderColor: isDark ? '#2C2C2E' : '#e5e7eb',
                        },
                      ]}
                      placeholder={
                        selectedStatus === 'rejected'
                          ? 'Nhập lý do từ chối khiếu nại...'
                          : 'Nhập nội dung phản hồi cho khách hàng...'
                      }
                      placeholderTextColor={isDark ? '#8E8E93' : '#999'}
                      value={responseText}
                      onChangeText={setResponseText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      maxLength={1000}
                    />
                    <ThemedText style={[styles.helperText, { color: isDark ? '#8E8E93' : '#666' }]}>
                      {responseText.length}/1000 ký tự
                    </ThemedText>
                  </View>

                  {selectedComplaint.adminResponse?.response && (
                    <View style={[styles.previousResponseBox, { backgroundColor: isDark ? '#2C2C2E' : '#f0f9ff', borderLeftColor: '#0a7ea4' }]}>
                      <ThemedText style={[styles.previousResponseLabel, { color: '#0a7ea4' }]}>
                        Phản hồi trước đó ({new Date(selectedComplaint.adminResponse.respondedAt).toLocaleDateString('vi-VN')}):
                      </ThemedText>
                      <ThemedText style={[styles.previousResponseText, { color: isDark ? '#fff' : '#374151' }]}>
                        {selectedComplaint.adminResponse.response}
                      </ThemedText>
                      <ThemedText style={[styles.previousResponseAdmin, { color: isDark ? '#8E8E93' : '#666' }]}>
                        Bởi: {selectedComplaint.adminResponse.respondedBy?.username}
                      </ThemedText>
                    </View>
                  )}
                </ScrollView>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#f5f5f5' }]}
                    onPress={() => {
                      setShowResponseModal(false);
                      setResponseText('');
                      setSelectedComplaint(null);
                    }}
                  >
                    <ThemedText style={[styles.cancelButtonText, { color: isDark ? '#fff' : '#666' }]}>Hủy</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleSubmitResponse}
                    disabled={processingId !== null || (selectedStatus === 'rejected' && !responseText.trim())}
                  >
                    {processingId ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <ThemedText style={styles.submitButtonText}>
                          {selectedStatus === 'resolved' ? 'Giải quyết' : selectedStatus === 'rejected' ? 'Từ chối' : 'Cập nhật'}
                        </ThemedText>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    maxHeight: 100,
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 6,
    alignItems: 'stretch',
  },
  filterTab: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 50,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  filterTabActive: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    lineHeight: 18,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  complaintCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoText: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    fontSize: 12,
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
  complaintContent: {
    gap: 12,
  },
  typePriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',     // giúp căn giữa theo trục dọc
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6', // nhẹ nhàng
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#111',
  },
  complaintContentText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#444',
    lineHeight: 20,
  },
  responsePreview: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginTop: 8,
  },
  responsePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  responsePreviewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  complaintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateText: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  modalScroll: {
    maxHeight: '70%',
  },
  complaintDetailBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSelectionContainer: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 12,
    fontWeight: '400',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 50,
    maxHeight: 50,
    overflow: 'hidden',
  },
  statusButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  responseInputContainer: {
    marginBottom: 20,
  },
  responseInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 140,
    marginTop: 8,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    textAlign: 'right',
  },
  previousResponseBox: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  previousResponseLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  previousResponseText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  previousResponseAdmin: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ef4444',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

