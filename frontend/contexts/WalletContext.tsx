import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Alert, Platform } from 'react-native';

// Đối với Android emulator, localhost không hoạt động, cần dùng 10.0.2.2
const getApiUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL;
  
  // Nếu không có env variable, dùng default
  if (!url) {
    if (Platform.OS === 'android') {
      url = 'http://10.0.2.2:5000'; // Android emulator
    } else {
      url = 'http://localhost:5000'; // iOS simulator và web
    }
  }
  
  // Normalize URL: chuyển https sang http cho local development
  // KHÔNG chuyển nếu là ngrok hoặc domain thật
  if (url.startsWith('https://')) {
    const isLocal = url.includes('localhost') || 
                   url.includes('127.0.0.1') || 
                   url.includes('10.0.2.2') ||
                   /192\.168\.\d+\.\d+/.test(url) ||
                   /10\.\d+\.\d+\.\d+/.test(url);
    const isNgrok = url.includes('ngrok');
    
    // Chỉ chuyển sang http nếu là local và KHÔNG phải ngrok
    if (isLocal && !isNgrok) {
      url = url.replace('https://', 'http://');
    }
  }
  
  // Đảm bảo không có /api ở cuối (vì sẽ thêm vào endpoint)
  url = url.replace(/\/api\/?$/, '');
  
  return url;
};

const API_URL = getApiUrl();

console.log('=== Wallet Context Initialized ===');
console.log('API_URL:', API_URL);
console.log('====================================');

interface Wallet {
  _id: string;
  user: string;
  balance: number;
  currency: string;
  status: 'active' | 'locked' | 'suspended';
  totalDeposited: number;
  totalWithdrawn: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  _id: string;
  wallet: string;
  user: string;
  type: 'deposit' | 'withdraw' | 'payment' | 'refund' | 'bonus';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  paymentGatewayTxnRef?: string;
  booking?: any;
  description: string;
  note?: string;
  createdAt: string;
  completedAt?: string;
}

interface TransactionResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface WalletContextType {
  wallet: Wallet | null;
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchWallet: () => Promise<void>;
  fetchTransactions: (page?: number, limit?: number) => Promise<void>;
  createDepositMoMo: (amount: number) => Promise<{
    paymentUrl: string;
    orderId: string;
    requestId?: string;
    qrCodeUrl?: string;
    deeplink?: string;
    deeplinkMiniApp?: string;
  }>;
  createDepositVNPay: (amount: number) => Promise<{
    paymentUrl: string;
    txnRef: string;
    amount?: number;
  }>;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!token || !isAuthenticated) {
      console.log('No token or not authenticated, skipping wallet fetch');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching wallet from:', `${API_URL}/api/wallet`);
      
      const response = await fetch(`${API_URL}/api/wallet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Wallet response status:', response.status);

      const data = await response.json();
      console.log('Wallet data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tải thông tin ví');
      }

      if (data.success) {
        setWallet(data.data);
      } else {
        throw new Error(data.message || 'Không thể tải thông tin ví');
      }
    } catch (err: any) {
      console.error('Error fetching wallet:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      setError(err.message || 'Lỗi khi tải thông tin ví');
      
      // Chỉ hiển thị alert nếu không phải lỗi network
      if (err.message && !err.message.includes('Network request failed')) {
        Alert.alert('Lỗi', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  const fetchTransactions = useCallback(async (page = 1, limit = 20) => {
    if (!token || !isAuthenticated) {
      console.log('No token or not authenticated, skipping transactions fetch');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/wallet/transactions?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tải lịch sử giao dịch');
      }

      if (data.success) {
        setTransactions(data.data.transactions);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.message || 'Không thể tải lịch sử giao dịch');
      }
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Lỗi khi tải lịch sử giao dịch');
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  const createDepositMoMo = useCallback(async (amount: number): Promise<{
    paymentUrl: string;
    orderId: string;
    requestId?: string;
    qrCodeUrl?: string;
    deeplink?: string;
    deeplinkMiniApp?: string;
  }> => {
    if (!token || !isAuthenticated) {
      throw new Error('Vui lòng đăng nhập để nạp tiền');
    }

    try {
      console.log('Creating MoMo deposit:', { amount, url: `${API_URL}/api/wallet/deposit/momo` });
      
      const response = await fetch(`${API_URL}/api/wallet/deposit/momo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      console.log('MoMo response status:', response.status);

      const data = await response.json();
      console.log('MoMo response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tạo thanh toán MoMo');
      }

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Không thể tạo thanh toán MoMo');
      }
    } catch (err: any) {
      console.error('Error creating MoMo deposit:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw err;
    }
  }, [token, isAuthenticated]);

  const createDepositVNPay = useCallback(async (amount: number): Promise<{
    paymentUrl: string;
    txnRef: string;
    amount?: number;
  }> => {
    if (!token || !isAuthenticated) {
      throw new Error('Vui lòng đăng nhập để nạp tiền');
    }

    try {
      console.log('Creating VNPay deposit:', { amount, url: `${API_URL}/api/wallet/deposit/vnpay` });
      
      const response = await fetch(`${API_URL}/api/wallet/deposit/vnpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      console.log('VNPay response status:', response.status);

      const data = await response.json();
      console.log('VNPay response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Không thể tạo thanh toán VNPay');
      }

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Không thể tạo thanh toán VNPay');
      }
    } catch (err: any) {
      console.error('Error creating VNPay deposit:', err);
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      throw err;
    }
  }, [token, isAuthenticated]);

  const refreshWallet = useCallback(async () => {
    setIsRefreshing(true);
    await fetchWallet();
    setIsRefreshing(false);
  }, [fetchWallet]);

  // Tự động fetch wallet khi user đăng nhập
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchWallet();
    } else {
      // Clear wallet khi logout
      setWallet(null);
      setTransactions([]);
      setPagination(null);
    }
  }, [isAuthenticated, token, fetchWallet]);

  const value: WalletContextType = {
    wallet,
    transactions,
    pagination,
    isLoading,
    isRefreshing,
    error,
    fetchWallet,
    fetchTransactions,
    createDepositMoMo,
    createDepositVNPay,
    refreshWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

