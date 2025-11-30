import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticateWithBiometric, checkBiometricAvailability, getBiometricName, canUseBiometric, BiometricType } from '@/services/biometricService';

interface User {
  _id: string;
  username: string;
  email: string;
  phone?: string | null;
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
  biometricInfo: BiometricType | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkBiometric: () => Promise<void>;
  saveBiometricCredentials: (email: string, password: string) => Promise<void>;
  clearBiometricCredentials: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  roleName?: 'user' | 'host';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricInfo, setBiometricInfo] = useState<BiometricType | null>(null);

  // Load token from storage on mount
  useEffect(() => {
    loadToken();
    checkBiometric();
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
        // Lưu credentials để dùng cho biometric login (nếu user muốn)
        // Chỉ lưu khi đăng nhập thành công
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Đăng nhập thất bại');
    }
  };

  const loginWithBiometric = async () => {
    try {
      // Kiểm tra biometric availability
      const canUse = await canUseBiometric();
      if (!canUse) {
        throw new Error('Thiết bị không hỗ trợ hoặc chưa đăng ký vân tay/face ID');
      }

      // Xác thực bằng biometric
      const authResult = await authenticateWithBiometric('Xác thực để đăng nhập');
      
      if (!authResult.success) {
        throw new Error(authResult.error || 'Xác thực thất bại');
      }

      // Lấy credentials đã lưu
      let savedEmail: string | null = null;
      let savedPassword: string | null = null;

      if (Platform.OS === 'web') {
        savedEmail = await AsyncStorage.getItem('biometric_email');
        savedPassword = await AsyncStorage.getItem('biometric_password');
      } else {
        savedEmail = await SecureStore.getItemAsync('biometric_email');
        savedPassword = await SecureStore.getItemAsync('biometric_password');
      }

      if (!savedEmail || !savedPassword) {
        throw new Error('Chưa lưu thông tin đăng nhập. Vui lòng đăng nhập bằng email/password trước.');
      }

      // Đăng nhập với credentials đã lưu
      await login(savedEmail, savedPassword);
    } catch (error: any) {
      throw new Error(error.message || 'Đăng nhập bằng vân tay thất bại');
    }
  };

  const saveBiometricCredentials = async (email: string, password: string) => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem('biometric_email', email);
        await AsyncStorage.setItem('biometric_password', password);
      } else {
        await SecureStore.setItemAsync('biometric_email', email);
        await SecureStore.setItemAsync('biometric_password', password);
      }
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
      throw new Error('Không thể lưu thông tin đăng nhập');
    }
  };

  const clearBiometricCredentials = async () => {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem('biometric_email');
        await AsyncStorage.removeItem('biometric_password');
      } else {
        await SecureStore.deleteItemAsync('biometric_email');
        await SecureStore.deleteItemAsync('biometric_password');
      }
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  };

  const checkBiometric = async () => {
    try {
      const info = await checkBiometricAvailability();
      setBiometricInfo(info);
    } catch (error) {
      console.error('Error checking biometric:', error);
      setBiometricInfo({
        available: false,
        type: 'none',
        error: 'Lỗi kiểm tra xác thực sinh trắc học'
      });
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
      // Không xóa biometric credentials khi logout (để user có thể đăng nhập lại bằng fingerprint)
      // Nếu muốn xóa, uncomment dòng dưới:
      // await clearBiometricCredentials();
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
        biometricInfo,
        login,
        register,
        loginWithGoogle,
        loginWithBiometric,
        logout,
        refreshUser,
        checkBiometric,
        saveBiometricCredentials,
        clearBiometricCredentials,
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

