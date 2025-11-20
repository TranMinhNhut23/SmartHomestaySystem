import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/services/api';

interface User {
  _id: string;
}

interface TopHomestaysSectionProps {
  user: User;
}

interface Homestay {
  _id: string;
  name: string;
  images?: string[];
  address?: {
    province?: { name: string };
    district?: { name: string };
  };
  status?: string;
  featured?: boolean;
  rooms?: any[];
}

export function TopHomestaysSection({ user }: TopHomestaysSectionProps) {
  const [topHomestays, setTopHomestays] = useState<Homestay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const height = useSharedValue(1);

  useEffect(() => {
    loadTopHomestays();
  }, [user]);

  const loadTopHomestays = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHostHomestays({ limit: 5 });
      const homestays = response.success
        ? (Array.isArray(response.data) ? response.data : [])
        : [];
      // Sort by featured first, then by creation date
      const sorted = homestays
        .sort((a: any, b: any) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        })
        .slice(0, 5);
      setTopHomestays(sorted);
    } catch (error) {
      console.error('Error loading top homestays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (image: string | undefined) => {
    if (!image) return null;
    if (image.startsWith('http') || image.startsWith('data:image')) {
      return image;
    }
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${image.startsWith('/') ? image : `/uploads/${image}`}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Hoạt Động';
      case 'pending':
        return 'Chờ Duyệt';
      case 'rejected':
        return 'Từ Chối';
      default:
        return status;
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    height.value = withSpring(isExpanded ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: height.value * 1000,
      opacity: height.value,
    };
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0a7ea4" />
        </View>
      </View>
    );
  }

  if (topHomestays.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.sectionTitle}>Homestay Của Tôi</ThemedText>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/my-homestays' as any)}>
              <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={48} color="#9ca3af" />
          <ThemedText style={styles.emptyText}>Chưa có homestay nào</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-homestay' as any)}
          >
            <ThemedText style={styles.addButtonText}>Thêm Homestay</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>Homestay Của Tôi</ThemedText>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={toggleExpand}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#0a7ea4"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/my-homestays' as any)}>
            <ThemedText style={styles.viewAllText}>Xem tất cả</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <Animated.View style={[styles.homestaysList, animatedStyle]}>
        {topHomestays.map((homestay) => (
          <TouchableOpacity
            key={homestay._id}
            style={styles.homestayCard}
            onPress={() => router.push(`/homestay-detail?id=${homestay._id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.imageContainer}>
              {homestay.images && homestay.images.length > 0 ? (
                <Image
                  source={{ uri: getImageUrl(homestay.images[0]) || '' }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9ca3af" />
                </View>
              )}
              {homestay.featured && (
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={14} color="#fff" />
                  <ThemedText style={styles.featuredText}>Nổi Bật</ThemedText>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(homestay.status || 'active') + '20' },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: getStatusColor(homestay.status || 'active') },
                  ]}
                >
                  {getStatusLabel(homestay.status || 'active')}
                </ThemedText>
              </View>
            </View>

            <View style={styles.homestayInfo}>
              <ThemedText style={styles.homestayName} numberOfLines={2}>
                {homestay.name}
              </ThemedText>
              {homestay.address && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <ThemedText style={styles.locationText} numberOfLines={1}>
                    {homestay.address.district?.name || ''}
                    {homestay.address.district?.name && homestay.address.province?.name ? ', ' : ''}
                    {homestay.address.province?.name || ''}
                  </ThemedText>
                </View>
              )}
              {homestay.rooms && (
                <View style={styles.roomsRow}>
                  <Ionicons name="bed-outline" size={14} color="#6b7280" />
                  <ThemedText style={styles.roomsText}>
                    {homestay.rooms.length} phòng
                  </ThemedText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  homestaysList: {
    gap: 14,
    overflow: 'hidden',
  },
  homestayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featuredText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  homestayInfo: {
    padding: 12,
  },
  homestayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  roomsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomsText: {
    fontSize: 13,
    color: '#6b7280',
  },
});

