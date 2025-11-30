import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { UserInfoSection } from '@/components/account/UserInfoSection';
import { AuthButtonsSection } from '@/components/account/AuthButtonsSection';
import { PaymentAndRewardsSection } from '@/components/account/PaymentAndRewardsSection';
import { FeatureCardsSection } from '@/components/account/FeatureCardsSection';
import { HostDashboardSection } from '@/components/account/HostDashboardSection';
import { AdminDashboardSection } from '@/components/account/AdminDashboardSection';
import { WalletSection } from '@/components/account/WalletSection';
import { useFocusEffect } from '@react-navigation/native';

export default function AccountScreen() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { refreshWallet } = useWallet();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Refresh wallet mỗi khi screen được focus (để cập nhật số dư sau khi nạp tiền)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        console.log('🔄 Account screen focused, refreshing wallet...');
        refreshWallet();
      }
    }, [isAuthenticated, refreshWallet])
  );

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  const isHost = isAuthenticated && user?.roleName === 'host';
  const isAdmin = isAuthenticated && user?.roleName === 'admin';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={
          isAdmin 
            ? ['#8b5cf6', '#7c3aed', '#6d28d9'] 
            : isHost 
            ? ['#0a7ea4', '#0d8bb8', '#10a5c7'] 
            : ['#0a7ea4', '#0d8bb8']
        }
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ThemedText style={styles.headerTitle}>
          {isAdmin ? 'Dashboard Admin' : isHost ? 'Dashboard Host' : 'Tài Khoản'}
        </ThemedText>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isAdmin && user ? (
          <>
            <AdminDashboardSection user={user} />
            <AuthButtonsSection isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          </>
        ) : isHost && user ? (
          <>
            <HostDashboardSection user={user} />
            <AuthButtonsSection isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          </>
        ) : isAuthenticated && user ? (
          <>
            <UserInfoSection isAuthenticated={isAuthenticated} user={user} />
            <WalletSection />
            <View style={styles.contentSection}>
              <FeatureCardsSection isAuthenticated={isAuthenticated} user={user} />
            </View>
            <AuthButtonsSection isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          </>
        ) : (
          <>
            <UserInfoSection isAuthenticated={isAuthenticated} user={user} />
            <View style={styles.contentSection}>
              <PaymentAndRewardsSection />
              <FeatureCardsSection isAuthenticated={isAuthenticated} user={user} />
            </View>
            <AuthButtonsSection isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          </>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 40,
  },
  contentSection: {
    paddingHorizontal: 16,
    gap: 20,
  },
});
