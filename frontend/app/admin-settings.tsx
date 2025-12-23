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
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

interface BannerImage {
  id: string;
  image: string;
  title: string;
  link?: string;
  order: number;
  isActive: boolean;
}

interface SaleEvent {
  id: string;
  name: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  order: number;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  isActive: boolean;
  order: number;
}

type TabType = 'banners' | 'saleEvents' | 'categories';

export default function AdminSettingsScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('banners');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [saleEvents, setSaleEvents] = useState<SaleEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [editingBanner, setEditingBanner] = useState<BannerImage | null>(null);
  const [editingSaleEvent, setEditingSaleEvent] = useState<SaleEvent | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showSaleEventModal, setShowSaleEventModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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

    loadConfig();
  }, [isAuthenticated, user]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getSystemConfig();
      if (response.success && response.data) {
        const config = response.data;
        setBannerImages(config.homepage?.bannerImages || []);
        setSaleEvents(config.homepage?.saleEvents || []);
        setCategories(config.homepage?.categories || []);
      } else {
        throw new Error(response.message || 'Không thể tải cấu hình');
      }
    } catch (error: any) {
      console.error('Error loading config:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải cấu hình hệ thống');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConfig();
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const response = await apiService.updateSystemConfig({
        homepage: {
          bannerImages,
          saleEvents,
          categories,
        },
      });

      if (response.success) {
        Alert.alert('Thành công', 'Đã cập nhật cấu hình hệ thống');
        loadConfig();
      } else {
        throw new Error(response.message || 'Không thể cập nhật cấu hình');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật cấu hình');
    } finally {
      setSaving(false);
    }
  };

  // Banner Image Functions
  const handleAddBanner = () => {
    setEditingBanner({
      id: Date.now().toString(),
      image: '',
      title: '',
      link: '',
      order: bannerImages.length,
      isActive: true,
    });
    setShowBannerModal(true);
  };

  const handleEditBanner = (banner: BannerImage) => {
    setEditingBanner(banner);
    setShowBannerModal(true);
  };

  const handleSaveBanner = () => {
    if (!editingBanner) return;

    if (!editingBanner.image || !editingBanner.title) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    const index = bannerImages.findIndex((b) => b.id === editingBanner!.id);
    if (index >= 0) {
      const updated = [...bannerImages];
      updated[index] = editingBanner;
      setBannerImages(updated);
    } else {
      setBannerImages([...bannerImages, editingBanner]);
    }

    setShowBannerModal(false);
    setEditingBanner(null);
  };

  const handleDeleteBanner = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa banner này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setBannerImages(bannerImages.filter((b) => b.id !== id));
        },
      },
    ]);
  };

  const handleMoveBanner = (id: string, direction: 'up' | 'down') => {
    const index = bannerImages.findIndex((b) => b.id === id);
    if (index < 0) return;

    const newBanners = [...bannerImages];
    if (direction === 'up' && index > 0) {
      [newBanners[index], newBanners[index - 1]] = [
        newBanners[index - 1],
        newBanners[index],
      ];
      newBanners[index].order = index;
      newBanners[index - 1].order = index - 1;
    } else if (direction === 'down' && index < newBanners.length - 1) {
      [newBanners[index], newBanners[index + 1]] = [
        newBanners[index + 1],
        newBanners[index],
      ];
      newBanners[index].order = index;
      newBanners[index + 1].order = index + 1;
    }
    setBannerImages(newBanners);
  };

  // Sale Event Functions
  const handleAddSaleEvent = () => {
    setEditingSaleEvent({
      id: Date.now().toString(),
      name: '',
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      order: saleEvents.length,
    });
    setShowSaleEventModal(true);
  };

  const handleEditSaleEvent = (event: SaleEvent) => {
    setEditingSaleEvent(event);
    setShowSaleEventModal(true);
  };

  const handleSaveSaleEvent = () => {
    if (!editingSaleEvent) return;

    if (!editingSaleEvent.name || !editingSaleEvent.title) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    const index = saleEvents.findIndex((e) => e.id === editingSaleEvent!.id);
    if (index >= 0) {
      const updated = [...saleEvents];
      updated[index] = editingSaleEvent;
      setSaleEvents(updated);
    } else {
      setSaleEvents([...saleEvents, editingSaleEvent]);
    }

    setShowSaleEventModal(false);
    setEditingSaleEvent(null);
  };

  const handleDeleteSaleEvent = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa sự kiện này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setSaleEvents(saleEvents.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  // Category Functions
  const handleAddCategory = () => {
    setEditingCategory({
      id: Date.now().toString(),
      label: '',
      icon: 'home',
      isActive: true,
      order: categories.length,
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;

    if (!editingCategory.label || !editingCategory.icon) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    const index = categories.findIndex((c) => c.id === editingCategory!.id);
    if (index >= 0) {
      const updated = [...categories];
      updated[index] = editingCategory;
      setCategories(updated);
    } else {
      setCategories([...categories, editingCategory]);
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa danh mục này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setCategories(categories.filter((c) => c.id !== id));
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Cấu Hình Hệ Thống</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
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
        <ThemedText style={styles.headerTitle}>Cấu Hình Hệ Thống</ThemedText>
        <TouchableOpacity
          onPress={saveConfig}
          style={styles.saveButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'banners' && styles.tabActive]}
          onPress={() => setActiveTab('banners')}
        >
          <Ionicons
            name="images"
            size={20}
            color={activeTab === 'banners' ? '#6366f1' : '#666'}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === 'banners' && styles.tabTextActive,
            ]}
          >
            Banner
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'saleEvents' && styles.tabActive]}
          onPress={() => setActiveTab('saleEvents')}
        >
          <Ionicons
            name="flash"
            size={20}
            color={activeTab === 'saleEvents' ? '#6366f1' : '#666'}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === 'saleEvents' && styles.tabTextActive,
            ]}
          >
            Sự Kiện Sale
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Ionicons
            name="grid"
            size={20}
            color={activeTab === 'categories' ? '#6366f1' : '#666'}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === 'categories' && styles.tabTextActive,
            ]}
          >
            Danh Mục
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner Images Tab */}
        {activeTab === 'banners' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Hình Ảnh Banner</ThemedText>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddBanner}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <ThemedText style={styles.addButtonText}>Thêm</ThemedText>
              </TouchableOpacity>
            </View>

            {bannerImages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={64} color="#ccc" />
                <ThemedText style={styles.emptyText}>
                  Chưa có banner nào
                </ThemedText>
              </View>
            ) : (
              bannerImages
                .sort((a, b) => a.order - b.order)
                .map((banner, index) => (
                  <View key={banner.id} style={styles.bannerCard}>
                    <View style={styles.bannerImageContainer}>
                      {banner.image ? (
                        <Image
                          source={{ uri: banner.image }}
                          style={styles.bannerImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.bannerImagePlaceholder}>
                          <Ionicons name="image-outline" size={32} color="#ccc" />
                        </View>
                      )}
                      <View style={styles.bannerOverlay}>
                        <ThemedText style={styles.bannerTitle} numberOfLines={1}>
                          {banner.title || 'Chưa có tiêu đề'}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.bannerActions}>
                      <View style={styles.bannerInfo}>
                        <Switch
                          value={banner.isActive}
                          onValueChange={(value) => {
                            const updated = [...bannerImages];
                            const idx = updated.findIndex((b) => b.id === banner.id);
                            if (idx >= 0) {
                              updated[idx].isActive = value;
                              setBannerImages(updated);
                            }
                          }}
                          trackColor={{ false: '#ccc', true: '#6366f1' }}
                        />
                        <ThemedText style={styles.bannerStatus}>
                          {banner.isActive ? 'Hiển thị' : 'Ẩn'}
                        </ThemedText>
                      </View>

                      <View style={styles.bannerButtons}>
                        <TouchableOpacity
                          style={styles.moveButton}
                          onPress={() => handleMoveBanner(banner.id, 'up')}
                          disabled={index === 0}
                        >
                          <Ionicons
                            name="arrow-up"
                            size={18}
                            color={index === 0 ? '#ccc' : '#6366f1'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.moveButton}
                          onPress={() => handleMoveBanner(banner.id, 'down')}
                          disabled={index === bannerImages.length - 1}
                        >
                          <Ionicons
                            name="arrow-down"
                            size={18}
                            color={index === bannerImages.length - 1 ? '#ccc' : '#6366f1'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditBanner(banner)}
                        >
                          <Ionicons name="pencil" size={18} color="#10b981" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteBanner(banner.id)}
                        >
                          <Ionicons name="trash" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* Sale Events Tab */}
        {activeTab === 'saleEvents' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Sự Kiện Sale</ThemedText>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddSaleEvent}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <ThemedText style={styles.addButtonText}>Thêm</ThemedText>
              </TouchableOpacity>
            </View>

            {saleEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="flash-outline" size={64} color="#ccc" />
                <ThemedText style={styles.emptyText}>
                  Chưa có sự kiện sale nào
                </ThemedText>
              </View>
            ) : (
              saleEvents
                .sort((a, b) => a.order - b.order)
                .map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventInfo}>
                        <ThemedText style={styles.eventName}>{event.name}</ThemedText>
                        <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
                        {event.description && (
                          <ThemedText style={styles.eventDescription}>
                            {event.description}
                          </ThemedText>
                        )}
                        <View style={styles.eventDates}>
                          <ThemedText style={styles.eventDate}>
                            Từ: {new Date(event.startDate).toLocaleDateString('vi-VN')}
                          </ThemedText>
                          <ThemedText style={styles.eventDate}>
                            Đến: {new Date(event.endDate).toLocaleDateString('vi-VN')}
                          </ThemedText>
                        </View>
                      </View>
                      <Switch
                        value={event.isActive}
                        onValueChange={(value) => {
                          const updated = [...saleEvents];
                          const idx = updated.findIndex((e) => e.id === event.id);
                          if (idx >= 0) {
                            updated[idx].isActive = value;
                            setSaleEvents(updated);
                          }
                        }}
                        trackColor={{ false: '#ccc', true: '#6366f1' }}
                      />
                    </View>
                    <View style={styles.eventActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditSaleEvent(event)}
                      >
                        <Ionicons name="pencil" size={18} color="#10b981" />
                        <ThemedText style={styles.actionButtonText}>Sửa</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteSaleEvent(event.id)}
                      >
                        <Ionicons name="trash" size={18} color="#ef4444" />
                        <ThemedText style={styles.actionButtonText}>Xóa</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Danh Mục</ThemedText>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddCategory}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <ThemedText style={styles.addButtonText}>Thêm</ThemedText>
              </TouchableOpacity>
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="grid-outline" size={64} color="#ccc" />
                <ThemedText style={styles.emptyText}>
                  Chưa có danh mục nào
                </ThemedText>
              </View>
            ) : (
              categories
                .sort((a, b) => a.order - b.order)
                .map((category) => (
                  <View key={category.id} style={styles.categoryCard}>
                    <View style={styles.categoryIconContainer}>
                      <Ionicons
                        name={category.icon as any}
                        size={24}
                        color={category.isActive ? '#6366f1' : '#ccc'}
                      />
                    </View>
                    <View style={styles.categoryInfo}>
                      <ThemedText style={styles.categoryLabel}>
                        {category.label}
                      </ThemedText>
                      <ThemedText style={styles.categoryId}>ID: {category.id}</ThemedText>
                    </View>
                    <View style={styles.categoryActions}>
                      <Switch
                        value={category.isActive}
                        onValueChange={(value) => {
                          const updated = [...categories];
                          const idx = updated.findIndex((c) => c.id === category.id);
                          if (idx >= 0) {
                            updated[idx].isActive = value;
                            setCategories(updated);
                          }
                        }}
                        trackColor={{ false: '#ccc', true: '#6366f1' }}
                      />
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditCategory(category)}
                      >
                        <Ionicons name="pencil" size={18} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteCategory(category.id)}
                      >
                        <Ionicons name="trash" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Banner Modal */}
      <Modal
        visible={showBannerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBannerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingBanner && bannerImages.find((b) => b.id === editingBanner.id)
                  ? 'Sửa Banner'
                  : 'Thêm Banner'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowBannerModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>URL Hình Ảnh *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingBanner?.image || ''}
                  onChangeText={(text) =>
                    setEditingBanner({ ...editingBanner!, image: text })
                  }
                  placeholder="https://example.com/image.jpg"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Tiêu Đề *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingBanner?.title || ''}
                  onChangeText={(text) =>
                    setEditingBanner({ ...editingBanner!, title: text })
                  }
                  placeholder="Nhập tiêu đề banner"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Link (Tùy chọn)</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingBanner?.link || ''}
                  onChangeText={(text) =>
                    setEditingBanner({ ...editingBanner!, link: text })
                  }
                  placeholder="https://example.com"
                  placeholderTextColor="#999"
                />
              </View>

              {editingBanner?.image && (
                <View style={styles.formGroup}>
                  <ThemedText style={styles.formLabel}>Xem Trước</ThemedText>
                  <Image
                    source={{ uri: editingBanner.image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBannerModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveBanner}
              >
                <ThemedText style={styles.saveModalButtonText}>Lưu</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sale Event Modal */}
      <Modal
        visible={showSaleEventModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSaleEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingSaleEvent && saleEvents.find((e) => e.id === editingSaleEvent.id)
                  ? 'Sửa Sự Kiện Sale'
                  : 'Thêm Sự Kiện Sale'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowSaleEventModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Tên Sự Kiện *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingSaleEvent?.name || ''}
                  onChangeText={(text) =>
                    setEditingSaleEvent({ ...editingSaleEvent!, name: text })
                  }
                  placeholder="Ví dụ: Black Friday 2024"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Tiêu Đề *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingSaleEvent?.title || ''}
                  onChangeText={(text) =>
                    setEditingSaleEvent({ ...editingSaleEvent!, title: text })
                  }
                  placeholder="Tiêu đề hiển thị"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Mô Tả</ThemedText>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={editingSaleEvent?.description || ''}
                  onChangeText={(text) =>
                    setEditingSaleEvent({ ...editingSaleEvent!, description: text })
                  }
                  placeholder="Mô tả sự kiện"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Ngày Bắt Đầu *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingSaleEvent?.startDate || ''}
                  onChangeText={(text) =>
                    setEditingSaleEvent({ ...editingSaleEvent!, startDate: text })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Ngày Kết Thúc *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingSaleEvent?.endDate || ''}
                  onChangeText={(text) =>
                    setEditingSaleEvent({ ...editingSaleEvent!, endDate: text })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSaleEventModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveSaleEvent}
              >
                <ThemedText style={styles.saveModalButtonText}>Lưu</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingCategory && categories.find((c) => c.id === editingCategory.id)
                  ? 'Sửa Danh Mục'
                  : 'Thêm Danh Mục'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>ID *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingCategory?.id || ''}
                  onChangeText={(text) =>
                    setEditingCategory({ ...editingCategory!, id: text })
                  }
                  placeholder="sale, hotels, flights..."
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Nhãn *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingCategory?.label || ''}
                  onChangeText={(text) =>
                    setEditingCategory({ ...editingCategory!, label: text })
                  }
                  placeholder="Tên hiển thị"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Icon (Tên Ionicons) *</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={editingCategory?.icon || ''}
                  onChangeText={(text) =>
                    setEditingCategory({ ...editingCategory!, icon: text })
                  }
                  placeholder="flash, airplane, bed..."
                  placeholderTextColor="#999"
                />
                <ThemedText style={styles.formHint}>
                  Xem danh sách icon tại: https://ionic.io/ionicons
                </ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveCategory}
              >
                <ThemedText style={styles.saveModalButtonText}>Lưu</ThemedText>
              </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#6366f1',
    borderBottomWidth: 0,
    shadowColor: '#6366f1',
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
  saveButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  bannerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  bannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerStatus: {
    fontSize: 14,
    color: '#666',
  },
  bannerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  moveButton: {
    padding: 6,
  },
  editButton: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventDates: {
    flexDirection: 'row',
    gap: 16,
  },
  eventDate: {
    fontSize: 12,
    color: '#999',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 12,
    marginLeft: 4,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  categoryId: {
    fontSize: 12,
    color: '#999',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});









