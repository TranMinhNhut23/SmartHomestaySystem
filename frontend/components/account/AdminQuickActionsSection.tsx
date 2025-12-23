import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function AdminQuickActionsSection() {
  const quickActions = [
    {
      id: 'manage-users',
      title: 'Quản Lý Người Dùng',
      icon: 'people',
      route: '/admin-users',
      gradient: ['#8b5cf6', '#7c3aed'],
    },
    {
      id: 'pending-homestays',
      title: 'Phê Duyệt Homestay',
      icon: 'business',
      route: '/admin-pending-homestays',
      gradient: ['#0a7ea4', '#0d8bb8'],
    },
    {
      id: 'host-requests',
      title: 'Phê Duyệt Yêu Cầu Host',
      icon: 'person-add',
      route: '/admin-host-requests',
      gradient: ['#f59e0b', '#f97316'],
    },
    {
      id: 'complaints',
      title: 'Duyệt Khiếu Nại',
      icon: 'alert-circle',
      route: '/admin-complaints',
      gradient: ['#ef4444', '#dc2626'],
    },
    {
      id: 'statistics',
      title: 'Thống Kê & Báo Cáo',
      icon: 'stats-chart',
      route: '/admin-statistics',
      gradient: ['#ec4899', '#db2777'],
    },
    {
      id: 'system-settings',
      title: 'Cấu Hình Hệ Thống',
      icon: 'settings',
      route: '/admin-settings',
      gradient: ['#6366f1', '#4f46e5'],
    },
  ];

  return (
    <View style={styles.container}>
      <ThemedText style={styles.sectionTitle}>Thao Tác Nhanh</ThemedText>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={action.gradient as [string, string]}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.iconWrapper}>
                <Ionicons name={action.icon as any} size={36} color="#fff" />
              </View>
              <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  actionGradient: {
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});


