import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { getAvatarUrl } from '@/services/api';

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
  return (
    <View style={styles.userSection}>
      {isAuthenticated && user ? (
        <>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image
                source={{ uri: getAvatarUrl(user.avatar) || '' }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#0a7ea4" />
              </View>
            )}
          </View>
          <ThemedText style={styles.username}>{user.username}</ThemedText>
          <ThemedText style={styles.email}>{user.email}</ThemedText>
          {user.roleName && (
            <View style={styles.roleBadge}>
              <ThemedText style={styles.roleText}>
                {user.roleName === 'host' ? 'Chủ nhà' : user.roleName === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </ThemedText>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#0a7ea4" />
            </View>
          </View>
          <ThemedText style={styles.username}>Chưa đăng nhập</ThemedText>
          <ThemedText style={styles.email}>
            Đăng nhập để sử dụng đầy đủ tính năng
          </ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#0a7ea4',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0a7ea4',
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});





