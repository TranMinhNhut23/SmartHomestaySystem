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
} from 'react-native';
import { router, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, getAvatarUrl } from '@/services/api';

interface User {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  roleName: 'user' | 'host' | 'admin';
  isActive?: boolean;
  role?: {
    name: string;
    description: string;
  };
  wallet?: {
    balance: number;
    status: string;
  };
  createdAt: string;
}

export default function AdminUsersScreen() {
  const { user, isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'host' | 'admin'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    user: 0,
    host: 0,
    admin: 0,
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

    loadUsers();
  }, [isAuthenticated, user, roleFilter, searchQuery, page]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getAllUsers({
        roleName: roleFilter !== 'all' ? roleFilter : undefined,
        search: searchQuery || undefined,
        page,
        limit: 20,
      });
      
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      } else {
        throw new Error(response.message || 'Không thể tải danh sách người dùng');
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadUsers();
  };

  const handleToggleUserStatus = async (userId: string, username: string, currentStatus: boolean) => {
    try {
      const response = await apiService.toggleUserStatus(userId);
      if (response.success) {
        Alert.alert('Thành công', response.message || (currentStatus ? 'Đã vô hiệu hóa người dùng' : 'Đã kích hoạt người dùng'));
        loadUsers();
      } else {
        throw new Error(response.message || 'Không thể thay đổi trạng thái người dùng');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể thay đổi trạng thái người dùng');
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return '#8b5cf6';
      case 'host':
        return '#f59e0b';
      default:
        return '#10b981';
    }
  };

  const getRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'Quản Trị Viên';
      case 'host':
        return 'Chủ Nhà';
      default:
        return 'Người Dùng';
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Quản Lý Người Dùng</ThemedText>
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
        <ThemedText style={styles.headerTitle}>Quản Lý Người Dùng</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, roleFilter === 'all' && styles.statCardActive]}
          onPress={() => setRoleFilter('all')}
        >
          <ThemedText style={styles.statValue}>{stats.user + stats.host + stats.admin}</ThemedText>
          <ThemedText style={styles.statLabel}>Tổng</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, roleFilter === 'user' && styles.statCardActive]}
          onPress={() => setRoleFilter('user')}
        >
          <ThemedText style={styles.statValue}>{stats.user}</ThemedText>
          <ThemedText style={styles.statLabel}>Người Dùng</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, roleFilter === 'host' && styles.statCardActive]}
          onPress={() => setRoleFilter('host')}
        >
          <ThemedText style={styles.statValue}>{stats.host}</ThemedText>
          <ThemedText style={styles.statLabel}>Chủ Nhà</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, roleFilter === 'admin' && styles.statCardActive]}
          onPress={() => setRoleFilter('admin')}
        >
          <ThemedText style={styles.statValue}>{stats.admin}</ThemedText>
          <ThemedText style={styles.statLabel}>Admin</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <ThemedText style={styles.emptyText}>Không có người dùng nào</ThemedText>
          </View>
        ) : (
          users.map((userItem) => (
            <View key={userItem._id} style={[
              styles.userCard,
              userItem.isActive === false && { opacity: 0.7, borderColor: '#fca5a5' }
            ]}>
              <View style={styles.userInfo}>
                {userItem.avatar ? (
                  <Image
                    source={{ uri: getAvatarUrl(userItem.avatar) || '' }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color="#999" />
                  </View>
                )}
                <View style={styles.userDetails}>
                  <ThemedText style={styles.username}>{userItem.username}</ThemedText>
                  <ThemedText style={styles.email}>{userItem.email}</ThemedText>
                  {userItem.phone && (
                    <ThemedText style={styles.phone}>{userItem.phone}</ThemedText>
                  )}
                  <View style={styles.roleContainer}>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: getRoleColor(userItem.roleName) + '20' },
                      ]}
                    >
                      <ThemedText
                        style={[styles.roleText, { color: getRoleColor(userItem.roleName) }]}
                      >
                        {getRoleLabel(userItem.roleName)}
                      </ThemedText>
                    </View>
                    {userItem.isActive === false && (
                      <View style={styles.inactiveBadge}>
                        <ThemedText style={styles.inactiveText}>Không hoạt động</ThemedText>
                      </View>
                    )}
                    {userItem.wallet && (
                      <ThemedText style={styles.walletText}>
                        Ví: {new Intl.NumberFormat('vi-VN').format(userItem.wallet.balance)} VND
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                {userItem._id !== user?._id && userItem.roleName !== 'admin' && (
                  <TouchableOpacity
                    style={[
                      styles.statusToggleButton,
                      !userItem.isActive && styles.statusToggleButtonInactive
                    ]}
                    onPress={() => handleToggleUserStatus(
                      userItem._id, 
                      userItem.username, 
                      userItem.isActive ?? true
                    )}
                  >
                    <Ionicons 
                      name={userItem.isActive ? "checkmark-circle" : "close-circle"} 
                      size={20} 
                      color={userItem.isActive ? "#10b981" : "#ef4444"} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              onPress={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? '#ccc' : '#8b5cf6'} />
            </TouchableOpacity>
            <ThemedText style={styles.pageText}>
              Trang {page} / {totalPages}
            </ThemedText>
            <TouchableOpacity
              style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
              onPress={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={page === totalPages ? '#ccc' : '#8b5cf6'}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  statCardActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#7c3aed',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#111',
  },
  clearButton: {
    padding: 4,
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
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    opacity: 1,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  phone: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
    marginLeft: 8,
  },
  inactiveText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  walletText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusToggleButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusToggleButtonInactive: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  pageButton: {
    padding: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    color: '#666',
  },
});
