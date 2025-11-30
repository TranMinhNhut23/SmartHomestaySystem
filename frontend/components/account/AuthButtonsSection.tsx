import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface AuthButtonsSectionProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function AuthButtonsSection({ isAuthenticated, onLogout }: AuthButtonsSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
  };

  return (
    <View style={styles.authSection}>
      {!isAuthenticated ? (
        <>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/login' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
              style={styles.authButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <ThemedText style={styles.authButtonText}>Đăng Nhập</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authButtonSecondary, { 
              backgroundColor: isDark ? '#1C1C1E' : '#fff',
              borderColor: '#0a7ea4',
            }]}
            onPress={() => router.push('/register' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={22} color="#0a7ea4" />
            <ThemedText style={styles.authButtonSecondaryText} numberOfLines={1}>Đăng Ký</ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity 
          style={[styles.logoutButton, { 
            backgroundColor: isDark ? '#1C1C1E' : '#fff',
            borderColor: '#ff3b30',
          }]} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.logoutIconContainer}>
            <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
          </View>
          <ThemedText style={styles.logoutButtonText}>Đăng xuất</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  authSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  authButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  authButtonSecondary: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2.5,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonSecondaryText: {
    color: '#0a7ea4',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2.5,
    gap: 12,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#ff3b30',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});





