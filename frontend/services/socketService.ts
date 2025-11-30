import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

// Helper để normalize URL - chuyển HTTPS sang HTTP cho development
const normalizeUrl = (url: string): string => {
  if (url.startsWith('https://')) {
    const isLocal = url.includes('localhost') || 
                   url.includes('127.0.0.1') || 
                   /^https:\/\/192\.168\.\d+\.\d+/.test(url) ||
                   /^https:\/\/10\.\d+\.\d+\.\d+/.test(url);
    const isNgrok = url.includes('ngrok');
    
    if (isLocal && !isNgrok) {
      return url.replace('https://', 'http://');
    }
  }
  return url;
};

// Helper để lấy Socket URL
const getSocketUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL.replace('/api', '');
    return normalizeUrl(baseUrl);
  }
  
  // Default URLs cho development
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  
  return 'http://localhost:5000';
};

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  // Kết nối socket
  connect(token: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.token = token;
    const socketUrl = getSocketUrl();

    console.log('Connecting to socket:', socketUrl);

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  // Ngắt kết nối
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      console.log('Socket disconnected');
    }
  }

  // Lấy socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Kiểm tra đã kết nối chưa
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join tất cả chat rooms
  joinChats() {
    if (this.socket?.connected) {
      this.socket.emit('join-chats');
    }
  }

  // Join một chat room
  joinChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-chat', chatId);
    }
  }

  // Leave một chat room
  leaveChat(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-chat', chatId);
    }
  }

  // Gửi tin nhắn
  sendMessage(chatId: string, content: string, type: string = 'text') {
    if (this.socket?.connected) {
      this.socket.emit('send-message', { chatId, content, type });
    } else {
      console.error('Socket not connected');
    }
  }

  // Typing indicator
  typing(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { chatId });
    }
  }

  stopTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('stop-typing', { chatId });
    }
  }

  // Listen events
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Remove listener
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();

