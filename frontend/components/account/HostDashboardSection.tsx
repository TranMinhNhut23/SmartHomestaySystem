import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarUrl } from '@/services/api';
import { HostStatsSection } from './HostStatsSection';
import { HostQuickActionsSection } from './HostQuickActionsSection';
import { RecentBookingsSection } from './RecentBookingsSection';
import { TopHomestaysSection } from './TopHomestaysSection';

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
          colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
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
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="business" size={40} color="#fff" />
                </View>
              )}
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              </View>
            </View>
            <View style={styles.userInfo}>
              <ThemedText style={styles.welcomeText}>Xin chào,</ThemedText>
              <ThemedText style={styles.username}>{user.username}</ThemedText>
              <View style={styles.roleBadge}>
                <Ionicons name="star" size={14} color="#fbbf24" />
                <ThemedText style={styles.roleText}>Chủ Nhà</ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Section */}
      <HostStatsSection user={user} />

      {/* Quick Actions Section */}
      <HostQuickActionsSection />

      {/* Recent Bookings Section */}
      <RecentBookingsSection user={user} />

      {/* Top Homestays Section */}
      <TopHomestaysSection user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 28,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 2,
  },
  headerCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 4,
    marginTop: 8,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  headerGradient: {
    padding: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  roleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

