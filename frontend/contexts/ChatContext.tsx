import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { socketService } from '@/services/socketService';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';

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
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

interface Chat {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  host: {
    _id: string;
    username: string;
    avatar?: string;
  };
  homestay: {
    _id: string;
    name: string;
    images?: string[];
  };
  lastMessage?: Message;
  lastMessageAt?: string;
  unreadCount: {
    user: number;
    host: number;
  };
}

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  typingUsers: Set<string>;
  openChat: (hostId: string, homestayId: string) => Promise<void>;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  loadMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Kết nối socket khi user đăng nhập
  useEffect(() => {
    if (isAuthenticated && token) {
      const socket = socketService.connect(token);
      
      if (socket) {
        socket.on('connect', () => {
          setIsConnected(true);
          socketService.joinChats();
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        // Listen cho tin nhắn mới
        socket.on('new-message', (data: { message: Message; chatId: string }) => {
          if (currentChat && data.chatId === currentChat._id) {
            setMessages(prev => [...prev, data.message]);
          }
          // Cập nhật lastMessage trong chats
          setChats(prev => prev.map(chat => 
            chat._id === data.chatId 
              ? { ...chat, lastMessage: data.message, lastMessageAt: data.message.createdAt }
              : chat
          ));
        });

        // Listen cho typing indicator
        socket.on('user-typing', (data: { userId: string; username: string; chatId: string }) => {
          if (currentChat && data.chatId === currentChat._id) {
            setTypingUsers(prev => new Set(prev).add(data.userId));
          }
        });

        socket.on('user-stop-typing', (data: { userId: string; chatId: string }) => {
          if (currentChat && data.chatId === currentChat._id) {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
          }
        });

        socket.on('error', (error: { message: string }) => {
          console.error('Socket error:', error);
        });
      }
    } else {
      socketService.disconnect();
      setIsConnected(false);
    }

    return () => {
      socketService.off('connect');
      socketService.off('disconnect');
      socketService.off('new-message');
      socketService.off('user-typing');
      socketService.off('user-stop-typing');
      socketService.off('error');
    };
  }, [isAuthenticated, token, currentChat]);

  // Load messages
  const loadMessages = useCallback(async (chatId?: string) => {
    const targetChatId = chatId || currentChat?._id;
    if (!targetChatId) return;

    try {
      const response = await apiService.get(`/chat/${targetChatId}/messages`);
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentChat]);

  // Đánh dấu đã đọc
  const markAsRead = useCallback(async (chatId?: string) => {
    const targetChatId = chatId || currentChat?._id;
    if (!targetChatId) return;

    try {
      await apiService.put(`/chat/${targetChatId}/read`);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [currentChat]);

  // Mở chat với host
  const openChat = useCallback(async (hostId: string, homestayId: string) => {
    try {
      setIsLoading(true);

      // Tìm hoặc tạo chat
      const response = await apiService.post('/chat/find-or-create', {
        hostId,
        homestayId
      });

      if (response.success && response.data) {
        const chat = response.data;
        setCurrentChat(chat);

        // Join chat room
        socketService.joinChat(chat._id);

        // Load messages
        await loadMessages(chat._id);

        // Đánh dấu đã đọc
        await markAsRead(chat._id);
      } else {
        throw new Error(response.message || 'Không thể mở chat');
      }
    } catch (error: any) {
      console.error('Error opening chat:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadMessages, markAsRead]);

  // Wrapper functions để gọi không cần tham số
  const loadMessagesWrapper = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  const markAsReadWrapper = useCallback(async () => {
    await markAsRead();
  }, [markAsRead]);

  // Gửi tin nhắn
  const sendMessage = useCallback(async (content: string) => {
    if (!currentChat || !content.trim()) return;

    try {
      // Nếu chưa có tin nhắn nào được load, tự động load tin nhắn cũ trước
      if (messages.length === 0 && currentChat._id) {
        await loadMessages(currentChat._id);
      }

      // Gửi qua socket (realtime)
      socketService.sendMessage(currentChat._id, content.trim());

      // Optimistic update - thêm tin nhắn vào UI ngay
      const tempMessage: Message = {
        _id: `temp-${Date.now()}`,
        chat: currentChat._id,
        sender: {
          _id: user!._id,
          username: user!.username,
          avatar: user!.avatar
        },
        content: content.trim(),
        type: 'text',
        status: 'sent',
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, tempMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [currentChat, user, messages.length, loadMessages]);

  // Đóng chat
  const closeChat = useCallback(() => {
    if (currentChat) {
      socketService.leaveChat(currentChat._id);
    }
    setCurrentChat(null);
    setMessages([]);
    setTypingUsers(new Set());
  }, [currentChat]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        messages,
        isLoading,
        isConnected,
        typingUsers,
        openChat,
        closeChat,
        sendMessage,
        loadMessages: loadMessagesWrapper,
        markAsRead: markAsReadWrapper,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

