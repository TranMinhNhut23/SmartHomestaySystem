import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Text,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { apiService, BASE_URL } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useChatUnread } from '@/contexts/ChatUnreadContext';
import { getAvatarUrl } from '@/services/api';
import { socketService } from '@/services/socketService';

const { width } = Dimensions.get('window');

interface Message {
  _id: string;
  chat: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  status?: string;
  createdAt: string;
  isTemp?: boolean;
  tempId?: string;
}

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
}

export default function ChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { user, token } = useAuth();
  const { refreshUnreadCount } = useChatUnread();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempMessagesMap = useRef<Map<string, string>>(new Map()); // Map tempId -> real messageId
  const inputRef = useRef<TextInput>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (chatId) {
      loadChat();
      loadMessages();
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [chatId]);

  // Handle keyboard show/hide
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // Scroll to bottom when keyboard shows
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Optional: handle keyboard hide
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socketService.isConnected()) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (data: { message: Message; chatId: string }) => {
      if (data.chatId === chatId) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          const exists = prev.some(msg => msg._id === data.message._id);
          if (exists) {
            return prev;
          }
          
          // If this is our message, try to replace temp message
          if (data.message.sender._id === user?._id) {
            // Find temp message with same type (sent recently)
            // For images, content will be different (base64 vs URL), so compare by type and timestamp
            const now = Date.now();
            const tempMsg = prev.find(msg => 
              msg.isTemp && 
              msg.type === data.message.type &&
              new Date(msg.createdAt).getTime() > now - 5000 // Within 5 seconds
            );
            
            if (tempMsg) {
              // Replace temp message with real one
              return prev.map(msg => 
                msg.tempId === tempMsg.tempId ? { ...data.message } : msg
              );
            }
          } else {
            // If message is from other person, refresh unread count
            // (though it should be 0 since we're in the chat)
            refreshUnreadCount();
          }
          
          return [...prev, data.message];
        });
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        // Message from other chat, refresh unread count
        refreshUnreadCount();
      }
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [chatId]);

  const connectSocket = async () => {
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
      
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('connect', () => {
          socket.emit('join-chat', chatId);
          // Mark as read when joining
          apiService.markChatAsRead(chatId).catch(console.error);
        });
      }
    } else if (socketService.isConnected()) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('join-chat', chatId);
        apiService.markChatAsRead(chatId)
          .then(() => refreshUnreadCount())
          .catch(console.error);
      }
    }
  };

  const disconnectSocket = () => {
    if (socketService.isConnected() && chatId) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('leave-chat', chatId);
      }
    }
  };

  const loadChat = async () => {
    try {
      const response = await apiService.getChatById(chatId!);
      if (response.success && response.data) {
        setChat(response.data);
      }
    } catch (error: any) {
      console.error('Error loading chat:', error);
    }
  };

  const loadMessages = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await apiService.getChatMessages(chatId!, {
        page: pageNum,
        limit: 50,
      });

      if (response.success && response.data) {
        const newMessages = response.data;
        
        // Messages từ backend đã được reverse từ mới đến cũ thành cũ đến mới
        // Thứ tự: cũ trên, mới dưới
        if (append) {
          // Load more: thêm vào đầu (tin nhắn cũ hơn)
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          // Initial load: giữ nguyên thứ tự (cũ đến mới)
          setMessages(newMessages);
          // Scroll to bottom after initial load (tin nhắn mới nhất ở cuối)
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }

        setHasMore(newMessages.length === 50 && newMessages.length > 0);
        setPage(pageNum);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!isLoadingMore && hasMore) {
      loadMessages(page + 1, true);
    }
  };

  const handleSend = async (imageUri?: string, imageBase64?: string) => {
    const content = imageBase64 ? imageBase64 : messageText.trim();
    if (!content || isSending) return;

    if (!imageBase64) {
      setMessageText('');
    }

    const tempId = `temp-${Date.now()}`;
    const messageType = imageBase64 ? 'image' : 'text';

    // Optimistic update
    const tempMessage: Message = {
      _id: tempId,
      tempId: tempId,
      chat: chatId!,
      sender: {
        _id: user!._id,
        username: user!.username,
        avatar: user!.avatar,
      },
      content: imageUri || content,
      type: messageType,
      status: 'sent',
      createdAt: new Date().toISOString(),
      isTemp: true,
    };

    setMessages(prev => [...prev, tempMessage]);
    setIsSending(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Send via socket if connected, otherwise use REST API
      // CHỈ gửi 1 lần, không gửi cả socket và REST API
      if (socketService.isConnected()) {
        const socket = socketService.getSocket();
        if (socket) {
          // Chỉ gửi qua socket, temp message sẽ được replace khi nhận new-message event
          socket.emit('send-message', {
            chatId,
            content,
            type: messageType,
          });
        } else {
          // Socket không connected, dùng REST API
          const response = await apiService.sendMessage(chatId!, content, messageType);
          if (response.success && response.data) {
            // Replace temp with real message
            setMessages(prev => prev.map(msg => 
              msg.tempId === tempId ? response.data : msg
            ));
          }
        }
      } else {
        // Socket không connected, dùng REST API
        const response = await apiService.sendMessage(chatId!, content, messageType);
        if (response.success && response.data) {
          // Replace temp with real message
          setMessages(prev => prev.map(msg => 
            msg.tempId === tempId ? response.data : msg
          ));
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Giảm quality để giảm kích thước
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;

        // Convert to base64 với compression
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Kiểm tra kích thước (max 5MB)
        const sizeInMB = blob.size / 1024 / 1024;
        if (sizeInMB > 5) {
          Alert.alert('Lỗi', 'Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB');
          return;
        }

        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64 = reader.result as string;
          handleSend(uri, base64);
        };
        
        reader.onerror = () => {
          Alert.alert('Lỗi', 'Không thể xử lý ảnh');
        };
        
        reader.readAsDataURL(blob);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', error.message || 'Không thể chọn ảnh');
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);

    // Typing indicator
    if (socketService.isConnected() && chatId) {
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('typing', { chatId });

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 1 second
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('stop-typing', { chatId });
        }, 1000);
      }
    }
  };

  const getOtherParticipant = () => {
    if (!chat || !user) return null;

    const currentUserId = user._id;

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days === 1) return 'Hôm qua';
    if (days < 7) return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item: message, index }: { item: Message; index: number }) => {
    const isMe = message.sender._id === user?._id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.sender._id !== message.sender._id || 
      new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 2 * 60 * 1000; // 2 minutes
    const showTime = !prevMessage || 
      new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 5 * 60 * 1000; // 5 minutes

    const avatarUrl = message.sender.avatar ? getAvatarUrl(message.sender.avatar) : null;
    const isImage = message.type === 'image';
    // Get image URL - có thể là base64 (temp) hoặc server URL
    let imageUri: string | null = null;
    if (isImage) {
      if (message.content.startsWith('data:') || message.content.startsWith('http')) {
        imageUri = message.content;
      } else if (message.content.startsWith('/uploads/')) {
        // Relative URL từ server, cần thêm base URL
        imageUri = `${BASE_URL}${message.content}`;
      } else {
        imageUri = message.content;
      }
    }

    return (
      <View>
        {showTime && (
          <View style={styles.timeSeparator}>
            <ThemedText style={styles.timeSeparatorText}>
              {formatTime(message.createdAt)}
            </ThemedText>
          </View>
        )}
        
        <View
          style={[
            styles.messageContainer,
            isMe ? styles.messageContainerMe : styles.messageContainerOther,
          ]}
        >
          {!isMe && (
            <View style={styles.avatarContainer}>
              {showAvatar && avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.messageAvatar} />
              ) : showAvatar ? (
                <View style={[styles.messageAvatarPlaceholder, { backgroundColor: colors.icon + '20' }]}>
                  <Ionicons name="person" size={16} color={colors.icon} />
                </View>
              ) : (
                <View style={styles.messageAvatarSpacer} />
              )}
            </View>
          )}
          
          {isMe && <View style={styles.messageAvatarSpacer} />}

          <View
            style={[
              styles.messageBubble,
              isMe
                ? [styles.messageBubbleMe, { backgroundColor: '#0a7ea4' }]
                : [styles.messageBubbleOther, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }],
              isImage && styles.messageBubbleImage,
            ]}
          >
            {isImage ? (
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => setSelectedImage(imageUri || message.content)}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: imageUri || message.content }} 
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                {message.isTemp && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <ThemedText
                style={[
                  styles.messageText,
                  isMe ? styles.messageTextMe : styles.messageTextOther,
                ]}
              >
                {message.content}
              </ThemedText>
            )}
            
            <ThemedText
              style={[
                styles.messageTime,
                isMe ? styles.messageTimeMe : styles.messageTimeOther,
              ]}
            >
              {formatMessageTime(message.createdAt)}
              {message.isTemp && ' • Đang gửi...'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const otherParticipant = getOtherParticipant();
  const otherParticipantAvatar = otherParticipant?.avatar ? getAvatarUrl(otherParticipant.avatar) : null;

  if (isLoading && messages.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  const handleInputFocus = () => {
    // Scroll to bottom when input is focused
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {otherParticipantAvatar ? (
            <Image source={{ uri: otherParticipantAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: '#fff20' }]}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.headerName} numberOfLines={1}>
              {otherParticipant?.username || 'Người dùng'}
            </ThemedText>
            {chat?.homestay && (
              <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
                {chat.homestay.name}
              </ThemedText>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item._id || `message-${index}`}
        contentContainerStyle={styles.messagesList}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
        onContentSizeChange={() => {
          // Auto scroll to bottom when content size changes
          if (messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }
        }}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.icon} />
            <ThemedText style={styles.emptyText}>Chưa có tin nhắn nào</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Bắt đầu cuộc trò chuyện
            </ThemedText>
          </View>
        }
      />

      {/* Input Area */}
      <View style={[styles.inputContainer, { 
        backgroundColor: isDark ? '#1C1C1E' : '#fff',
        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }]}>
        <TouchableOpacity
          style={[styles.attachButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
          onPress={pickImage}
          disabled={isSending}
        >
          <Ionicons name="image-outline" size={22} color={isDark ? '#fff' : '#0a7ea4'} />
        </TouchableOpacity>
        
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
              color: isDark ? '#fff' : '#000',
            },
          ]}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
          value={messageText}
          onChangeText={handleTextChange}
          onFocus={handleInputFocus}
          multiline
          maxLength={5000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageViewerModal}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={() => setSelectedImage(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  messagesList: {
    paddingHorizontal: 1,
    paddingVertical: 8,
    paddingBottom: 8,
  },
  timeSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timeSeparatorText: {
    fontSize: 12,
    opacity: 0.6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: 2,
  },
  messageContainerMe: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 40,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarSpacer: {
    width: 40,
    height: 32,
  },
  messageBubble: {
    maxWidth: '75%',
    minWidth: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageBubbleImage: {
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImage: {
    width: Math.min(width * 0.5, 250),
    height: Math.min(width * 0.5, 250),
    borderRadius: 12,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  messageSenderName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeOther: {
    color: 'rgba(0,0,0,0.5)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  loadingMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  imageViewerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageViewerImage: {
    width: width,
    height: '100%',
  },
});

