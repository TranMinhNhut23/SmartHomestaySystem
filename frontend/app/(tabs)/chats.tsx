import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Text,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useChatUnread } from '@/contexts/ChatUnreadContext';
import { getHomestayImageUrl } from '@/services/api';
import { getAvatarUrl } from '@/services/api';

interface Chat {
  _id: string;
  chatType: 'user-host' | 'user-admin' | 'host-admin';
  user?: {
    _id: string;
    username: string;
    avatar?: string;
    roleName?: string;
  };
  host?: {
    _id: string;
    username: string;
    avatar?: string;
    roleName?: string;
  };
  admin?: {
    _id: string;
    username: string;
    avatar?: string;
    roleName?: string;
  };
  homestay?: {
    _id: string;
    name: string;
    images?: string[];
  };
  lastMessage?: {
    content: string;
    type: string;
    createdAt: string;
    sender: {
      _id: string;
      username: string;
      avatar?: string;
    };
  };
  lastMessageAt?: string;
  unreadCount: {
    user: number;
    host: number;
    admin: number;
  };
}

export default function ChatsScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { unreadCount: unreadChatCount, refreshUnreadCount } = useChatUnread();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadChats();
    refreshUnreadCount();
  }, []);

  const loadChats = async () => {
    try {
      const response = await apiService.getUserChats();
      if (response.success && response.data) {
        setChats(response.data);
      }
    } catch (error: any) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Group chats by type
  const groupChatsByType = () => {
    const grouped: {
      'user-host': Chat[];
      'user-admin': Chat[];
      'host-admin': Chat[];
    } = {
      'user-host': [],
      'user-admin': [],
      'host-admin': [],
    };

    chats.forEach(chat => {
      if (chat.chatType in grouped) {
        grouped[chat.chatType as keyof typeof grouped].push(chat);
      }
    });

    return grouped;
  };

  const getSectionTitle = (chatType: string) => {
    const roleName = user?.roleName || 'user';
    
    if (chatType === 'user-host') {
      if (roleName === 'user') return 'Chat với Host';
      if (roleName === 'host') return 'Chat với User';
      if (roleName === 'admin') return 'Chat User - Host';
    } else if (chatType === 'user-admin') {
      if (roleName === 'user') return 'Chat với Admin';
      if (roleName === 'admin') return 'Chat với User';
    } else if (chatType === 'host-admin') {
      if (roleName === 'host') return 'Chat với Admin';
      if (roleName === 'admin') return 'Chat với Host';
    }
    return '';
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadChats();
    refreshUnreadCount();
  };

  const getOtherParticipant = (chat: Chat) => {
    const currentUserId = user?._id;
    if (!currentUserId) return null;

    if (chat.chatType === 'user-host') {
      if (chat.user?._id === currentUserId) {
        return chat.host;
      }
      return chat.user;
    } else if (chat.chatType === 'user-admin') {
      if (chat.user?._id === currentUserId) {
        return chat.admin;
      }
      return chat.user;
    } else if (chat.chatType === 'host-admin') {
      if (chat.host?._id === currentUserId) {
        return chat.admin;
      }
      return chat.host;
    }
    return null;
  };

  const getUnreadCount = (chat: Chat) => {
    const currentUserId = user?._id;
    if (!currentUserId) return 0;

    if (chat.chatType === 'user-host') {
      return chat.user?._id === currentUserId ? chat.unreadCount.user : chat.unreadCount.host;
    } else if (chat.chatType === 'user-admin') {
      return chat.user?._id === currentUserId ? chat.unreadCount.user : chat.unreadCount.admin;
    } else if (chat.chatType === 'host-admin') {
      return chat.host?._id === currentUserId ? chat.unreadCount.host : chat.unreadCount.admin;
    }
    return 0;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  );

  const renderChatItem = ({ item: chat }: { item: Chat }) => {
    const otherParticipant = getOtherParticipant(chat);
    const unreadCount = getUnreadCount(chat);
    const avatarUrl = otherParticipant?.avatar ? getAvatarUrl(otherParticipant.avatar) : null;
    const homestayImageUrl = chat.homestay?.images?.[0] 
      ? getHomestayImageUrl(chat.homestay.images[0])
      : null;

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}
        onPress={() => router.push(`/chat/${chat._id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.chatItemContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.icon + '20' }]}>
                <Ionicons name="person" size={24} color={colors.icon} />
              </View>
            )}
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <ThemedText style={styles.chatName} numberOfLines={1}>
                {otherParticipant?.username || 'Người dùng'}
              </ThemedText>
              {chat.lastMessageAt && (
                <ThemedText style={styles.chatTime}>
                  {formatTime(chat.lastMessageAt)}
                </ThemedText>
              )}
            </View>

            <View style={styles.chatFooter}>
              {chat.homestay && (
                <View style={styles.homestayTag}>
                  {homestayImageUrl ? (
                    <Image source={{ uri: homestayImageUrl }} style={styles.homestayImage} />
                  ) : (
                    <Ionicons name="home" size={12} color={colors.icon} />
                  )}
                  <ThemedText style={styles.homestayName} numberOfLines={1}>
                    {chat.homestay.name}
                  </ThemedText>
                </View>
              )}
              
              {chat.lastMessage && (
                <ThemedText 
                  style={[
                    styles.lastMessage,
                    unreadCount > 0 && styles.lastMessageUnread
                  ]}
                  numberOfLines={1}
                >
                  {chat.lastMessage.sender._id === user?._id ? 'Bạn: ' : ''}
                  {chat.lastMessage.type === 'text' 
                    ? chat.lastMessage.content 
                    : chat.lastMessage.type === 'image' 
                    ? '📷 Hình ảnh'
                    : '📎 File'}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ThemedText style={styles.headerTitle}>Tin Nhắn</ThemedText>
        {unreadChatCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {unreadChatCount > 99 ? '99+' : unreadChatCount}
            </Text>
          </View>
        )}
      </LinearGradient>

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.icon} />
          <ThemedText style={styles.emptyText}>Chưa có tin nhắn nào</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Bắt đầu trò chuyện với host hoặc admin
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={({ item, index }) => {
            // Check if this is the first item of a section
            let showSectionHeader = false;
            let sectionTitle = '';
            
            if (index === 0) {
              showSectionHeader = true;
              sectionTitle = getSectionTitle(item.chatType);
            } else {
              const prevChat = chats[index - 1];
              if (prevChat.chatType !== item.chatType) {
                showSectionHeader = true;
                sectionTitle = getSectionTitle(item.chatType);
              }
            }

            return (
              <>
                {showSectionHeader && renderSectionHeader(sectionTitle)}
                {renderChatItem({ item })}
              </>
            );
          }}
          keyExtractor={(item, index) => `${item._id}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  chatItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homestayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120,
  },
  homestayImage: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  homestayName: {
    fontSize: 11,
    color: '#0a7ea4',
    fontWeight: '500',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    opacity: 0.7,
  },
  lastMessageUnread: {
    fontWeight: '600',
    opacity: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

