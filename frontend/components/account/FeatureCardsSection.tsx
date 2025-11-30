import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface User {
  roleName?: string;
}

interface FeatureCardsSectionProps {
  isAuthenticated: boolean;
  user: User | null;
}

export function FeatureCardsSection({ isAuthenticated, user }: FeatureCardsSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const renderFeatureCard = (
    title: string,
    description: string,
    icon: string,
    iconColors: [string, string, ...string[]],
    onPress: () => void,
    isLocked: boolean = false,
    isHighlighted: boolean = false
  ) => (
    <TouchableOpacity
      style={[
        styles.featureCard,
        { backgroundColor: isDark ? '#1C1C1E' : '#fff' },
        isHighlighted && styles.hostRequestCard,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLocked}
    >
      <View style={styles.featureCardLeft}>
        <LinearGradient
          colors={iconColors}
          style={[styles.cardIconContainer, isHighlighted && styles.hostRequestIcon]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon as any} size={22} color="#fff" />
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={12} color="#666" />
            </View>
          )}
        </LinearGradient>
        <View style={styles.featureCardContent}>
          <ThemedText style={[
            styles.featureCardTitle,
            { color: isDark ? '#fff' : '#11181C' },
            isHighlighted && styles.hostRequestTitle,
          ]}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.featureCardDescription, { color: isDark ? '#8E8E93' : '#666' }]}>
            {description}
          </ThemedText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? '#8E8E93' : '#0a7ea4'} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="grid-outline" size={22} color={isDark ? '#fff' : '#0a7ea4'} />
        <ThemedText style={styles.sectionTitle}>Tính năng dành cho thành viên</ThemedText>
      </View>

      {/* Đơn đặt phòng của tôi (cho tất cả user đã đăng nhập) */}
      {isAuthenticated && renderFeatureCard(
        'Đơn Đặt Phòng Của Tôi',
        'Xem và quản lý tất cả đơn đặt phòng của bạn',
        'calendar-outline',
        ['#0a7ea4', '#0d8bb8'],
        () => router.push('/my-bookings' as any)
      )}

      {/* Khuyến mãi (host và admin) */}
      {isAuthenticated && (user?.roleName === 'host' || user?.roleName === 'admin') && renderFeatureCard(
        'Khuyến Mãi',
        `Tạo và quản lý mã khuyến mãi ${user?.roleName === 'admin' ? 'cho toàn hệ thống' : 'cho homestay của bạn'}`,
        'pricetags-outline',
        ['#f59e0b', '#d97706'],
        () => router.push('/promotions' as any)
      )}

      {/* Yêu cầu trở thành host (cho user chưa phải host hoặc admin) */}
      {isAuthenticated && user?.roleName !== 'host' && user?.roleName !== 'admin' && renderFeatureCard(
        'Trở Thành Host',
        'Gửi yêu cầu để trở thành host và quản lý homestay',
        'business',
        ['#0a7ea4', '#0d8bb8'],
        () => router.push('/host-request-form' as any),
        false,
        true
      )}

      {/* Duyệt homestay (chỉ admin) */}
      {isAuthenticated && user?.roleName === 'admin' && renderFeatureCard(
        'Duyệt Homestay',
        'Duyệt homestay mới đăng của tất cả các host',
        'checkmark-circle-outline',
        ['#10b981', '#059669'],
        () => router.push('/admin-pending-homestays' as any)
      )}

      {/* Quản lý homestay (chỉ host, không phải admin) */}
      {isAuthenticated && user?.roleName === 'host' && (
        <>
          {renderFeatureCard(
            'Quản Lý Homestay',
            'Xem và quản lý tất cả homestay của bạn',
            'business-outline',
            ['#0a7ea4', '#0d8bb8'],
            () => router.push('/my-homestays' as any)
          )}
          {renderFeatureCard(
            'Thêm Homestay Mới',
            'Tạo homestay mới để cho thuê',
            'add-circle-outline',
            ['#10b981', '#059669'],
            () => router.push('/add-homestay' as any)
          )}
          {renderFeatureCard(
            'Quản Lý Đơn Đặt Phòng',
            'Xem và quản lý tất cả đơn đặt phòng của homestay',
            'calendar-outline',
            ['#3b82f6', '#2563eb'],
            () => router.push('/host-bookings' as any)
          )}
        </>
      )}

      {/* Thông tin hành khách */}
      {renderFeatureCard(
        'Thông tin hành khách',
        'Quản lý thông tin hành khách đã lưu và địa chỉ đã lưu của bạn',
        'document-text-outline',
        ['#6b7280', '#4b5563'],
        () => {},
        true
      )}

      {/* Yêu cầu hoàn tiền */}
      {isAuthenticated ? renderFeatureCard(
        'Yêu cầu Hoàn Tiền',
        'Gửi yêu cầu hoàn tiền cho đơn đặt phòng',
        'cash-outline',
        ['#10b981', '#059669'],
        () => router.push('/refund-request' as any)
      ) : renderFeatureCard(
        'Yêu cầu Hoàn Tiền',
        'Đăng nhập để sử dụng tính năng này',
        'swap-horizontal-outline',
        ['#6b7280', '#4b5563'],
        () => {},
        true
      )}

      {/* Trung tâm hỗ trợ */}
      {renderFeatureCard(
        'Trung tâm hỗ trợ',
        'Nơi giải đáp mọi thắc mắc của bạn',
        'help-circle-outline',
        ['#6366f1', '#4f46e5'],
        () => {}
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  featureCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },
  featureCardContent: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    letterSpacing: 0.1,
  },
  featureCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  hostRequestCard: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
  },
  hostRequestIcon: {
    // Already using gradient
  },
  hostRequestTitle: {
    color: '#0a7ea4',
    fontWeight: '800',
  },
});

