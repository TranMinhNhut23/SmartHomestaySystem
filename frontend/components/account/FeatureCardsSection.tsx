import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';

interface User {
  roleName?: string;
}

interface FeatureCardsSectionProps {
  isAuthenticated: boolean;
  user: User | null;
}

export function FeatureCardsSection({ isAuthenticated, user }: FeatureCardsSectionProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.sectionTitle}>Tính năng dành cho thành viên</ThemedText>

      {/* Đơn đặt phòng của tôi (cho tất cả user đã đăng nhập) */}
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => router.push('/my-bookings' as any)}
        >
          <View style={styles.featureCardLeft}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#0a7ea4" />
            </View>
            <View style={styles.featureCardContent}>
              <ThemedText style={styles.featureCardTitle}>Đơn Đặt Phòng Của Tôi</ThemedText>
              <ThemedText style={styles.featureCardDescription}>
                Xem và quản lý tất cả đơn đặt phòng của bạn
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
        </TouchableOpacity>
      )}

      {/* Khuyến mãi (host và admin) */}
      {isAuthenticated && (user?.roleName === 'host' || user?.roleName === 'admin') && (
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => router.push('/promotions' as any)}
        >
          <View style={styles.featureCardLeft}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="pricetags-outline" size={24} color="#0a7ea4" />
            </View>
            <View style={styles.featureCardContent}>
              <ThemedText style={styles.featureCardTitle}>Khuyến Mãi</ThemedText>
              <ThemedText style={styles.featureCardDescription}>
                Tạo và quản lý mã khuyến mãi {user?.roleName === 'admin' ? 'cho toàn hệ thống' : 'cho homestay của bạn'}
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
        </TouchableOpacity>
      )}

      {/* Yêu cầu trở thành host (cho user chưa phải host hoặc admin) */}
      {isAuthenticated && user?.roleName !== 'host' && user?.roleName !== 'admin' && (
        <TouchableOpacity
          style={[styles.featureCard, styles.hostRequestCard]}
          onPress={() => router.push('/host-request-form' as any)}
        >
          <View style={styles.featureCardLeft}>
            <View style={[styles.cardIconContainer, styles.hostRequestIcon]}>
              <Ionicons name="business" size={24} color="#fff" />
            </View>
            <View style={styles.featureCardContent}>
              <ThemedText style={[styles.featureCardTitle, styles.hostRequestTitle]}>
                Trở Thành Host
              </ThemedText>
              <ThemedText style={styles.featureCardDescription}>
                Gửi yêu cầu để trở thành host và quản lý homestay
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
        </TouchableOpacity>
      )}

      {/* Duyệt homestay (chỉ admin) */}
      {isAuthenticated && user?.roleName === 'admin' && (
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => router.push('/admin-pending-homestays' as any)}
        >
          <View style={styles.featureCardLeft}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#0a7ea4" />
            </View>
            <View style={styles.featureCardContent}>
              <ThemedText style={styles.featureCardTitle}>Duyệt Homestay</ThemedText>
              <ThemedText style={styles.featureCardDescription}>
                Duyệt homestay mới đăng của tất cả các host
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
        </TouchableOpacity>
      )}

      {/* Quản lý homestay (chỉ host, không phải admin) */}
      {isAuthenticated && user?.roleName === 'host' && (
        <>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/my-homestays' as any)}
          >
            <View style={styles.featureCardLeft}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="business-outline" size={24} color="#0a7ea4" />
              </View>
              <View style={styles.featureCardContent}>
                <ThemedText style={styles.featureCardTitle}>Quản Lý Homestay</ThemedText>
                <ThemedText style={styles.featureCardDescription}>
                  Xem và quản lý tất cả homestay của bạn
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/add-homestay' as any)}
          >
            <View style={styles.featureCardLeft}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="add-circle-outline" size={24} color="#0a7ea4" />
              </View>
              <View style={styles.featureCardContent}>
                <ThemedText style={styles.featureCardTitle}>Thêm Homestay Mới</ThemedText>
                <ThemedText style={styles.featureCardDescription}>
                  Tạo homestay mới để cho thuê
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/host-bookings' as any)}
          >
            <View style={styles.featureCardLeft}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="calendar-outline" size={24} color="#0a7ea4" />
              </View>
              <View style={styles.featureCardContent}>
                <ThemedText style={styles.featureCardTitle}>Quản Lý Đơn Đặt Phòng</ThemedText>
                <ThemedText style={styles.featureCardDescription}>
                  Xem và quản lý tất cả đơn đặt phòng của homestay
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
          </TouchableOpacity>
        </>
      )}

      {/* Thông tin hành khách */}
      <TouchableOpacity style={styles.featureCard}>
        <View style={styles.featureCardLeft}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="document-text-outline" size={24} color="#666" />
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={12} color="#666" />
            </View>
          </View>
          <View style={styles.featureCardContent}>
            <ThemedText style={styles.featureCardTitle}>Thông tin hành khách</ThemedText>
            <ThemedText style={styles.featureCardDescription}>
              Quản lý thông tin hành khách đã lưu và địa chỉ đã lưu của bạn
            </ThemedText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
      </TouchableOpacity>

      {/* Hoàn tiền */}
      <TouchableOpacity style={styles.featureCard}>
        <View style={styles.featureCardLeft}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="swap-horizontal-outline" size={24} color="#666" />
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={12} color="#666" />
            </View>
          </View>
          <View style={styles.featureCardContent}>
            <ThemedText style={styles.featureCardTitle}>Hoàn tiền</ThemedText>
            <ThemedText style={styles.featureCardDescription}>
              Theo dõi hoàn tiền và quản lý chi tiết ngân hàng
            </ThemedText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
      </TouchableOpacity>

      {/* Trung tâm hỗ trợ */}
      <TouchableOpacity style={styles.featureCard}>
        <View style={styles.featureCardLeft}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="help-circle-outline" size={24} color="#666" />
          </View>
          <View style={styles.featureCardContent}>
            <ThemedText style={styles.featureCardTitle}>Trung tâm hỗ trợ</ThemedText>
            <ThemedText style={styles.featureCardDescription}>
              Nơi giải đáp mọi thắc mắc của bạn
            </ThemedText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
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
    marginLeft: 12,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  featureCardDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  hostRequestCard: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  hostRequestIcon: {
    backgroundColor: '#0a7ea4',
  },
  hostRequestTitle: {
    color: '#0a7ea4',
    fontWeight: '700',
  },
});

