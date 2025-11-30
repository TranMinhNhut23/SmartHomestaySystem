import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { getAvatarUrl } from '@/services/api';
import { HostStatsSection } from './HostStatsSection';
import { HostQuickActionsSection } from './HostQuickActionsSection';
import { HostWalletSection } from './HostWalletSection';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  roleName?: string;
}

interface HostDashboardSectionProps {
  user: User;
}

export function HostDashboardSection({ user }: HostDashboardSectionProps) {
  return (
    <View style={styles.container}>
      {/* Host Header Card */}
      <View style={styles.headerCard}>
        <LinearGradient
          colors={['#0d8bb8', '#10a5c7', '#14b8d4']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              {user.avatar ? (
                <Image
                  source={{ uri: getAvatarUrl(user.avatar) || '' }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']}
                  style={styles.avatarPlaceholder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="business" size={36} color="#fff" />
                </LinearGradient>
              )}
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              </View>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userInfoHeader}>
                <View style={styles.userInfoText}>
                  <ThemedText style={styles.welcomeText}>Xin chào,</ThemedText>
                  <ThemedText style={styles.username}>{user.username}</ThemedText>
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push('/edit-profile' as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.roleBadge}>
                <Ionicons name="star" size={13} color="#fbbf24" />
                <ThemedText style={styles.roleText}>Chủ Nhà</ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Section */}
      <HostStatsSection user={user} />

      {/* Wallet Section */}
      <HostWalletSection />

      {/* Quick Actions Section */}
      <HostQuickActionsSection />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  headerCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 0,
    marginTop: 0,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  headerGradient: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  userInfoText: {
    flex: 1,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    marginBottom: 3,
    fontWeight: '500',
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 18,
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

