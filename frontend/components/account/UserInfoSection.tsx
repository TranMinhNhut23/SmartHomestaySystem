import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAvatarUrl } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface User {
  username: string;
  email: string;
  avatar?: string;
  roleName?: string;
}

interface UserInfoSectionProps {
  isAuthenticated: boolean;
  user: User | null;
}

export function UserInfoSection({ isAuthenticated, user }: UserInfoSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.userSection, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
      {isAuthenticated && user ? (
        <>
          <LinearGradient
            colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <View style={styles.avatarContainer}>
                {user.avatar ? (
                  <Image
                    source={{ uri: getAvatarUrl(user.avatar) || '' }}
                    style={styles.avatar}
                  />
                ) : (
                  <LinearGradient
                    colors={['#0a7ea4', '#0d8bb8']}
                    style={styles.avatarPlaceholder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="person" size={36} color="#fff" />
                  </LinearGradient>
                )}
                <View style={styles.avatarBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)' }]}
                onPress={() => router.push('/edit-profile' as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color={isDark ? '#fff' : '#0a7ea4'} />
              </TouchableOpacity>
            </View>
            <View style={styles.userInfo}>
              <ThemedText style={[styles.username, { color: '#fff' }]}>{user.username}</ThemedText>
              <ThemedText style={[styles.email, { color: 'rgba(255,255,255,0.9)' }]}>{user.email}</ThemedText>
              {user.roleName && (
                <View style={styles.roleBadge}>
                  <Ionicons 
                    name={user.roleName === 'host' ? 'business' : user.roleName === 'admin' ? 'shield' : 'person'} 
                    size={12} 
                    color="#fff" 
                  />
                  <ThemedText style={styles.roleText}>
                    {user.roleName === 'host' ? 'Chủ nhà' : user.roleName === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.notLoggedInContainer}>
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatarPlaceholderNotLoggedIn, 
              { 
                backgroundColor: isDark ? '#2C2C2E' : '#f0f0f0',
                borderColor: isDark ? '#2C2C2E' : '#e0e0e0',
              }
            ]}>
              <Ionicons name="person" size={40} color={isDark ? '#8E8E93' : '#0a7ea4'} />
            </View>
          </View>
          <ThemedText style={[styles.username, { color: isDark ? '#fff' : '#11181C' }]}>Chưa đăng nhập</ThemedText>
          <ThemedText style={[styles.email, { color: isDark ? '#8E8E93' : '#666' }]}>
            Đăng nhập để sử dụng đầy đủ tính năng
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userSection: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contentContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  notLoggedInContainer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarPlaceholderNotLoggedIn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  roleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});





