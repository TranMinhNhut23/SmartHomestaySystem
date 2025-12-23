import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

interface ChatUnreadContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  isLoading: boolean;
}

const ChatUnreadContext = createContext<ChatUnreadContextType | undefined>(undefined);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.getUnreadChatCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread chat count:', error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Refresh khi app được focus hoặc user thay đổi
  useEffect(() => {
    if (isAuthenticated) {
      refreshUnreadCount();
      
      // Refresh mỗi 30 giây
      const interval = setInterval(() => {
        refreshUnreadCount();
      }, 30000);

      // Refresh khi app được focus
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          refreshUnreadCount();
        }
      });

      return () => {
        clearInterval(interval);
        subscription.remove();
      };
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshUnreadCount]);

  return (
    <ChatUnreadContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        isLoading,
      }}
    >
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread() {
  const context = useContext(ChatUnreadContext);
  if (context === undefined) {
    throw new Error('useChatUnread must be used within a ChatUnreadProvider');
  }
  return context;
}





















