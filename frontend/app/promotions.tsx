import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

interface CouponForm {
  name: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  maxDiscount?: string;
  minOrder?: string;
  maxUsagePerUser?: string;
  maxUsageTotal?: string;
  startDate: string; // yyyy-mm-dd
  endDate: string;   // yyyy-mm-dd
  status: 'active' | 'inactive';
}

export default function PromotionsScreen() {
  const { isAuthenticated, user } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState<CouponForm>({
    name: '',
    code: '',
    discountType: 'percent',
    discountValue: '',
    maxDiscount: '',
    minOrder: '',
    maxUsagePerUser: '',
    maxUsageTotal: '',
    startDate: new Date().toISOString().slice(0,10),
    endDate: new Date(new Date().setDate(new Date().getDate()+30)).toISOString().slice(0,10),
    status: 'active',
  });

  useEffect(() => {
    if (!isAuthenticated || (user?.roleName !== 'host' && user?.roleName !== 'admin')) {
      Alert.alert('Không có quyền', 'Chỉ host hoặc admin mới truy cập được', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }
    loadCoupons();
  }, [isAuthenticated, user]);

  const loadCoupons = async () => {
    try {
      setIsLoading(true);
      const res = await apiService.getAllCoupons();
      if (res.success) {
        setCoupons(res.data || []);
      } else {
        throw new Error(res.message || 'Không thể tải danh sách khuyến mãi');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setForm({
      name: '',
      code: '',
      discountType: 'percent',
      discountValue: '',
      maxDiscount: '',
      minOrder: '',
      maxUsagePerUser: '',
      maxUsageTotal: '',
      startDate: new Date().toISOString().slice(0,10),
      endDate: new Date(new Date().setDate(new Date().getDate()+30)).toISOString().slice(0,10),
      status: 'active',
    });
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.discountValue.trim() || !form.startDate || !form.endDate) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ thông tin bắt buộc');
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };
      if (form.maxDiscount) payload.maxDiscount = parseFloat(form.maxDiscount);
      if (form.minOrder) payload.minOrder = parseFloat(form.minOrder);
      if (form.maxUsagePerUser) payload.maxUsagePerUser = parseInt(form.maxUsagePerUser);
      if (form.maxUsageTotal) payload.maxUsageTotal = parseInt(form.maxUsageTotal);

      const res = await apiService.createCoupon(payload);
      if (res.success) {
        setShowModal(false);
        await loadCoupons();
        Alert.alert('Thành công', 'Đã tạo mã khuyến mãi');
      } else {
        throw new Error(res.message || 'Tạo mã thất bại');
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Tạo mã thất bại');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, coupon: any) => {
    // Admin không được xóa mã của host
    if (user?.roleName === 'admin' && coupon.appliesTo === 'host') {
      Alert.alert('Thông báo', 'Admin không được phép xóa mã giảm giá của host');
      return;
    }

    Alert.alert('Xóa mã', 'Bạn có chắc muốn xóa mã này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            setListLoading(true);
            const res = await apiService.deleteCoupon(id);
            if (res.success) {
              await loadCoupons();
              Alert.alert('Thành công', 'Đã xóa mã');
            } else {
              throw new Error(res.message || 'Xóa mã thất bại');
            }
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Xóa mã thất bại');
          } finally {
            setListLoading(false);
          }
        }
      }
    ]);
  };

  const handleToggleStatus = async (coupon: any) => {
    // Host chỉ có thể toggle status của mã của mình
    if (user?.roleName === 'host' && coupon.appliesTo === 'host' && coupon.hostId?._id !== user._id) {
      Alert.alert('Thông báo', 'Bạn chỉ có thể thay đổi trạng thái mã của chính mình');
      return;
    }

    // Admin chỉ có thể toggle status của mã host, không được edit các field khác
    if (user?.roleName === 'admin' && coupon.appliesTo === 'host') {
      const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
      try {
        setListLoading(true);
        const res = await apiService.updateCoupon(coupon._id, { status: newStatus });
        if (res.success) {
          await loadCoupons();
          Alert.alert('Thành công', `Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} mã giảm giá`);
        } else {
          throw new Error(res.message || 'Cập nhật trạng thái thất bại');
        }
      } catch (e: any) {
        Alert.alert('Lỗi', e.message || 'Cập nhật trạng thái thất bại');
      } finally {
        setListLoading(false);
      }
      return;
    }

    // Host toggle status mã của mình
    if (user?.roleName === 'host' && coupon.appliesTo === 'host' && coupon.hostId?._id === user._id) {
      const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
      try {
        setListLoading(true);
        const res = await apiService.updateCoupon(coupon._id, { status: newStatus });
        if (res.success) {
          await loadCoupons();
          Alert.alert('Thành công', `Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} mã giảm giá`);
        } else {
          throw new Error(res.message || 'Cập nhật trạng thái thất bại');
        }
      } catch (e: any) {
        Alert.alert('Lỗi', e.message || 'Cập nhật trạng thái thất bại');
      } finally {
        setListLoading(false);
      }
    }
  };

  const isEditable = (coupon: any) => {
    // Admin không được edit mã của host
    if (user?.roleName === 'admin' && coupon.appliesTo === 'host') {
      return false;
    }
    // Host chỉ edit được mã của mình
    if (user?.roleName === 'host' && coupon.appliesTo === 'host') {
      return coupon.hostId?._id === user._id;
    }
    // Admin có thể edit mã của admin
    if (user?.roleName === 'admin' && coupon.appliesTo === 'all') {
      return true;
    }
    return false;
  };

  const isDeletable = (coupon: any) => {
    // Admin không được xóa mã của host
    if (user?.roleName === 'admin' && coupon.appliesTo === 'host') {
      return false;
    }
    // Host chỉ xóa được mã của mình
    if (user?.roleName === 'host' && coupon.appliesTo === 'host') {
      return coupon.hostId?._id === user._id;
    }
    // Admin có thể xóa mã của admin
    if (user?.roleName === 'admin' && coupon.appliesTo === 'all') {
      return true;
    }
    return false;
  };

  if (isLoading) {
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
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Khuyến Mãi</ThemedText>
        <View style={styles.placeholder} />
      </LinearGradient>

      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.createButton} onPress={openCreate}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <ThemedText style={styles.createButtonText}>Tạo mã</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {coupons.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={64} color="#94a3b8" />
            <ThemedText style={styles.emptyText}>Chưa có mã khuyến mãi</ThemedText>
          </View>
        ) : (
          coupons.map((c) => {
            const isHostCoupon = c.appliesTo === 'host';
            const isOwnCoupon = user?.roleName === 'host' && c.hostId?._id === user._id;
            const isAdminViewingHostCoupon = user?.roleName === 'admin' && isHostCoupon;
            const canEdit = isEditable(c);
            const canDelete = isDeletable(c);

            return (
              <View key={c._id} style={[
                styles.card,
                isHostCoupon && user?.roleName === 'admin' && styles.hostCouponCard
              ]}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, c.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
                      <ThemedText style={styles.badgeText}>{c.status === 'active' ? 'Đang hoạt động' : 'Ngừng'}</ThemedText>
                    </View>
                    {isHostCoupon && (
                      <View style={styles.hostBadge}>
                        <Ionicons name="person" size={12} color="#10b981" />
                        <ThemedText style={styles.hostBadgeText}>
                          {isAdminViewingHostCoupon && c.hostId?.username 
                            ? `Host: ${c.hostId.username}` 
                            : 'Mã của Host'}
                        </ThemedText>
                      </View>
                    )}
                    {c.appliesTo === 'all' && (
                      <View style={styles.adminBadge}>
                        <Ionicons name="globe" size={12} color="#0a7ea4" />
                        <ThemedText style={styles.adminBadgeText}>Toàn hệ thống</ThemedText>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardActions}>
                    {(user?.roleName === 'admin' && isHostCoupon) || (user?.roleName === 'host' && isOwnCoupon) ? (
                      <TouchableOpacity 
                        onPress={() => handleToggleStatus(c)}
                        style={styles.toggleButton}
                        disabled={listLoading}
                      >
                        <Ionicons 
                          name={c.status === 'active' ? 'toggle' : 'toggle-outline'} 
                          size={20} 
                          color={c.status === 'active' ? '#10b981' : '#94a3b8'} 
                        />
                      </TouchableOpacity>
                    ) : null}
                    {canDelete && (
                      <TouchableOpacity onPress={() => handleDelete(c._id, c)}>
                        <Ionicons name="trash" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {isAdminViewingHostCoupon && (
                  <View style={styles.adminNotice}>
                    <Ionicons name="information-circle" size={16} color="#f59e0b" />
                    <ThemedText style={styles.adminNoticeText}>
                      Admin chỉ có thể thay đổi trạng thái của mã này
                    </ThemedText>
                  </View>
                )}
                <View style={styles.row}>
                  <ThemedText style={styles.label}>Tên mã</ThemedText>
                  <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>{c.name}</ThemedText>
                </View>
                <View style={styles.row}>
                  <ThemedText style={styles.label}>Mã</ThemedText>
                  <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>{c.code}</ThemedText>
                </View>
                <View style={styles.row}>
                  <ThemedText style={styles.label}>Loại</ThemedText>
                  <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>
                    {c.discountType === 'percent' ? 'Phần trăm' : 'Cố định'} ({c.discountValue}{c.discountType === 'percent' ? '%' : ' VNĐ'})
                  </ThemedText>
                </View>
                {c.maxDiscount ? (
                  <View style={styles.row}>
                    <ThemedText style={styles.label}>Giảm tối đa</ThemedText>
                    <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>
                      {c.maxDiscount?.toLocaleString('vi-VN')} VNĐ
                    </ThemedText>
                  </View>
                ) : null}
                {c.minOrder ? (
                  <View style={styles.row}>
                    <ThemedText style={styles.label}>Đơn tối thiểu</ThemedText>
                    <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>
                      {c.minOrder?.toLocaleString('vi-VN')} VNĐ
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <ThemedText style={styles.label}>Hiệu lực</ThemedText>
                  <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>
                    {new Date(c.startDate).toLocaleDateString('vi-VN')} - {new Date(c.endDate).toLocaleDateString('vi-VN')}
                  </ThemedText>
                </View>
                <View style={styles.row}>
                  <ThemedText style={styles.label}>Phạm vi</ThemedText>
                  <ThemedText style={[styles.value, !canEdit && styles.valueLocked]}>
                    {c.appliesTo === 'all' ? 'Toàn hệ thống' : `Homestay của ${isAdminViewingHostCoupon && c.hostId?.username ? c.hostId.username : 'host'}`}
                  </ThemedText>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
            <ThemedText style={[styles.modalTitle, { color: isDark ? '#fff' : '#11181C' }]}>Tạo mã khuyến mãi</ThemedText>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.formRow}>
              <ThemedText style={styles.inputLabel}>Tên mã</ThemedText>
              <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Ví dụ: Black Friday 50%" placeholderTextColor="#94a3b8" />
            </View>
            <View style={styles.formRow}>
              <ThemedText style={styles.inputLabel}>Mã</ThemedText>
              <TextInput style={styles.input} autoCapitalize="characters" value={form.code} onChangeText={(t) => setForm({ ...form, code: t.toUpperCase() })} placeholder="BF50" placeholderTextColor="#94a3b8" />
            </View>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Loại giảm</ThemedText>
                <View style={styles.typeTabs}>
                  <TouchableOpacity style={[styles.typeTab, form.discountType === 'percent' && styles.typeTabActive]} onPress={() => setForm({ ...form, discountType: 'percent' })}>
                    <ThemedText style={[styles.typeTabText, form.discountType === 'percent' && styles.typeTabTextActive]}>%</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.typeTab, form.discountType === 'fixed' && styles.typeTabActive]} onPress={() => setForm({ ...form, discountType: 'fixed' })}>
                    <ThemedText style={[styles.typeTabText, form.discountType === 'fixed' && styles.typeTabTextActive]}>VNĐ</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Giá trị</ThemedText>
                <TextInput style={styles.input} value={form.discountValue} keyboardType="numeric" onChangeText={(t) => setForm({ ...form, discountValue: t })} placeholder={form.discountType === 'percent' ? '50' : '100000'} placeholderTextColor="#94a3b8" />
              </View>
            </View>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Giảm tối đa (tuỳ chọn)</ThemedText>
                <TextInput style={styles.input} value={form.maxDiscount} keyboardType="numeric" onChangeText={(t) => setForm({ ...form, maxDiscount: t })} placeholder="100000" placeholderTextColor="#94a3b8" />
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Đơn tối thiểu (tuỳ chọn)</ThemedText>
                <TextInput style={styles.input} value={form.minOrder} keyboardType="numeric" onChangeText={(t) => setForm({ ...form, minOrder: t })} placeholder="200000" placeholderTextColor="#94a3b8" />
              </View>
            </View>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Giới hạn / user (tuỳ chọn)</ThemedText>
                <TextInput style={styles.input} value={form.maxUsagePerUser} keyboardType="numeric" onChangeText={(t) => setForm({ ...form, maxUsagePerUser: t })} placeholder="3" placeholderTextColor="#94a3b8" />
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Giới hạn tổng (tuỳ chọn)</ThemedText>
                <TextInput style={styles.input} value={form.maxUsageTotal} keyboardType="numeric" onChangeText={(t) => setForm({ ...form, maxUsageTotal: t })} placeholder="1000" placeholderTextColor="#94a3b8" />
              </View>
            </View>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Từ ngày</ThemedText>
                <TextInput style={styles.input} value={form.startDate} onChangeText={(t) => setForm({ ...form, startDate: t })} placeholder="2025-01-01" placeholderTextColor="#94a3b8" />
              </View>
              <View style={{ width: 14 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.inputLabel}>Đến ngày</ThemedText>
                <TextInput style={styles.input} value={form.endDate} onChangeText={(t) => setForm({ ...form, endDate: t })} placeholder="2025-01-31" placeholderTextColor="#94a3b8" />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => setShowModal(false)}>
                <ThemedText style={styles.modalCancelText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalCreate]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={styles.modalCreateText}>Tạo</ThemedText>}
              </TouchableOpacity>
            </View>
            </ScrollView>
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  placeholder: { width: 40 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  actionsBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badge: { 
    backgroundColor: '#f0f9ff', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 10 
  },
  badgeActive: {
    backgroundColor: '#d1fae5',
  },
  badgeInactive: {
    backgroundColor: '#f1f5f9',
  },
  badgeText: { color: '#0a7ea4', fontWeight: '700', fontSize: 11 },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  hostBadgeText: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '700',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  adminBadgeText: {
    color: '#0a7ea4',
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleButton: {
    padding: 4,
  },
  hostCouponCard: {
    borderColor: '#86efac',
    borderWidth: 1.5,
    backgroundColor: '#f0fdf4',
  },
  adminNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  adminNoticeText: {
    flex: 1,
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  value: { color: '#11181C', fontSize: 14, fontWeight: '700' },
  valueLocked: { 
    color: '#94a3b8', 
    fontStyle: 'italic',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },

  formRow: { marginBottom: 12 },
  inputLabel: { fontSize: 13, color: '#64748b', fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: '#11181C' },

  rowSplit: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeTabs: { flexDirection: 'row', gap: 8 },
  typeTab: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  typeTabActive: { backgroundColor: '#0a7ea4' },
  typeTabText: { color: '#64748b', fontWeight: '700' },
  typeTabTextActive: { color: '#fff' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancel: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  modalCreate: { backgroundColor: '#0a7ea4' },
  modalCancelText: { color: '#11181C', fontWeight: '700' },
  modalCreateText: { color: '#fff', fontWeight: '700' },
});
