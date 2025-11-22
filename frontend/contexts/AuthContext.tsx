import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role?: any;
  roleName?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  roleName?: 'user' | 'host';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from storage on mount
  useEffect(() => {
    loadToken();
  }, []);

  // Load user when token is available
  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // Helper functions to use SecureStore on native, AsyncStorage on web
  const loadToken = async () => {
    try {
      let storedToken: string | null = null;
      
      if (Platform.OS === 'web') {
        storedToken = await AsyncStorage.getItem('auth_token');
      } else {
        storedToken = await SecureStore.getItemAsync('auth_token');
      }
      
      if (storedToken) {
        setToken(storedToken);
        apiService.setToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToken = async (newToken: string) => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem('auth_token', newToken);
      } else {
        await SecureStore.setItemAsync('auth_token', newToken);
      }
      setToken(newToken);
      apiService.setToken(newToken);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  };

  const removeToken = async () => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem('auth_token');
      } else {
        await SecureStore.deleteItemAsync('auth_token');
      }
      setToken(null);
      apiService.setToken(null);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      if (response.success && response.data) {
        await saveToken(response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Đăng nhập thất bại');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await apiService.register(userData);
      if (response.success && response.data) {
        await saveToken(response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Đăng ký thất bại');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Đăng ký thất bại');
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      const response = await apiService.loginWithGoogle(idToken);
      if (response.success && response.data) {
        await saveToken(response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Đăng nhập bằng Google thất bại');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Đăng nhập bằng Google thất bại');
    }
  };

  const logout = async () => {
    // Set states immediately for instant UI update
    setUser(null);
    setToken(null);
    setIsLoading(false);
    // Remove token from storage (async operation)
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem('auth_token');
      } else {
        await SecureStore.deleteItemAsync('auth_token');
      }
      apiService.setToken(null);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Token might be invalid, logout
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

