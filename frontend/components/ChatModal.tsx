import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { getAvatarUrl } from '@/services/api';
import { socketService } from '@/services/socketService';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  homestayId: string;
  homestayName: string;
}

export function ChatModal({
  visible,
  onClose,
  hostId,
  hostName,
  hostAvatar,
  homestayId,
  homestayName,
}: ChatModalProps) {
  const { currentChat, messages, isLoading, isConnected, typingUsers, openChat, closeChat, sendMessage } = useChat();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Mở chat khi modal hiển thị
  useEffect(() => {
    if (visible && hostId && homestayId) {
      openChat(hostId, homestayId).catch((error) => {
        console.error('Error opening chat:', error);
      });
    } else if (!visible) {
      closeChat();
    }
  }, [visible, hostId, homestayId]);

  // Scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle typing indicator
  const handleTextChange = (text: string) => {
    setMessageText(text);

    if (currentChat && socketService.isConnected()) {
      socketService.typing(currentChat._id);

      // Clear previous timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout để stop typing
      const timeout = setTimeout(() => {
        socketService.stopTyping(currentChat._id);
      }, 1000);

      setTypingTimeout(timeout);
    }
  };

  // Gửi tin nhắn
  const handleSend = async () => {
    if (!messageText.trim() || isSending || !currentChat) return;

    try {
      setIsSending(true);
      await sendMessage(messageText.trim());
      setMessageText('');

      // Stop typing
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      if (currentChat) {
        socketService.stopTyping(currentChat._id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Format thời gian
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (senderId: string) => {
    return user?._id === senderId;
  };

  const otherParticipant = currentChat
    ? (currentChat.user._id === user?._id ? currentChat.host : currentChat.user)
    : { username: hostName, avatar: hostAvatar };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#11181C" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {otherParticipant.avatar && (
                <Image
                  source={{ uri: getAvatarUrl(otherParticipant.avatar) || '' }}
                  style={styles.avatar}
                />
              )}
              <View style={styles.headerText}>
                <ThemedText style={styles.headerName}>
                  {otherParticipant.username || hostName}
                </ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  {isConnected ? 'Đang hoạt động' : 'Đang kết nối...'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Messages */}
          {isLoading && !currentChat ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <ThemedText style={styles.loadingText}>Đang tải tin nhắn...</ThemedText>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#94a3b8" />
                  <ThemedText style={styles.emptyText}>
                    Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                  </ThemedText>
                </View>
              ) : (
                messages.map((message) => {
                  const isMine = isMyMessage(message.sender._id);
                  return (
                    <View
                      key={message._id}
                      style={[
                        styles.messageWrapper,
                        isMine ? styles.messageWrapperRight : styles.messageWrapperLeft,
                      ]}
                    >
                      {!isMine && message.sender.avatar && (
                        <Image
                          source={{ uri: getAvatarUrl(message.sender.avatar) || '' }}
                          style={styles.messageAvatar}
                        />
                      )}
                      <View
                        style={[
                          styles.messageBubble,
                          isMine ? styles.messageBubbleRight : styles.messageBubbleLeft,
                        ]}
                      >
                        {!isMine && (
                          <ThemedText style={styles.messageSender}>
                            {message.sender.username}
                          </ThemedText>
                        )}
                        <ThemedText style={[
                          styles.messageText,
                          isMine ? styles.messageTextRight : styles.messageTextLeft,
                        ]}>
                          {message.content}
                        </ThemedText>
                        <ThemedText style={[
                          styles.messageTime,
                          isMine ? styles.messageTimeRight : styles.messageTimeLeft,
                        ]}>
                          {formatTime(message.createdAt)}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsers.size > 0 && (
                <View style={[styles.messageWrapper, styles.messageWrapperLeft]}>
                  <View style={[styles.messageBubble, styles.messageBubbleLeft]}>
                    <View style={styles.typingIndicator}>
                      <View style={styles.typingDot} />
                      <View style={[styles.typingDot, styles.typingDotDelay1]} />
                      <View style={[styles.typingDot, styles.typingDotDelay2]} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#94a3b8"
              value={messageText}
              onChangeText={handleTextChange}
              multiline
              maxLength={5000}
              editable={!isSending && isConnected}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending || !isConnected) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending || !isConnected}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  closeButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageWrapperLeft: {
    justifyContent: 'flex-start',
  },
  messageWrapperRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleLeft: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#0a7ea4',
    borderBottomRightRadius: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: '#11181C',
  },
  messageTextRight: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeLeft: {
    color: '#94a3b8',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 4,
  },
  typingDotDelay1: {
    animationDelay: '0.2s',
  },
  typingDotDelay2: {
    animationDelay: '0.4s',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#11181C',
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
});


