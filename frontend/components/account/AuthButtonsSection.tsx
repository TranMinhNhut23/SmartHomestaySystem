import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthButtonsSectionProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function AuthButtonsSection({ isAuthenticated, onLogout }: AuthButtonsSectionProps) {
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
              colors={['#0a7ea4', '#0d8bb8']}
              style={styles.authButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <ThemedText style={styles.authButtonText}>Đăng Nhập</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.authButtonSecondary}
            onPress={() => router.push('/register' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={20} color="#0a7ea4" />
            <ThemedText style={styles.authButtonSecondaryText} numberOfLines={1}>Đăng Ký</ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
          <ThemedText style={styles.logoutButtonText}>Đăng xuất</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  authSection: {
    marginBottom: 24,
    gap: 14,
  },
  authButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  authButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  authButtonSecondary: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: '#fff',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  authButtonSecondaryText: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ff3b30',
    backgroundColor: '#fff',
    gap: 10,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#ff3b30',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});





