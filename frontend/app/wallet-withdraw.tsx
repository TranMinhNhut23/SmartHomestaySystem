import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';

export default function WalletWithdrawScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { wallet } = useWallet();
  const { token } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const handleAmountChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleWithdraw = async () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const amountValue = parseInt(amount);

    if (amountValue < 50000) {
      Alert.alert('Lỗi', 'Số tiền rút tối thiểu là 50,000 VND');
      return;
    }

    if (wallet && amountValue > wallet.balance) {
      Alert.alert('Lỗi', `Số dư không đủ. Số dư hiện tại: ${formatCurrency(wallet.balance)}`);
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin ngân hàng');
      return;
    }

    Alert.alert(
      'Xác nhận rút tiền',
      `Bạn muốn rút ${formatCurrency(amountValue)} về tài khoản ${accountNumber} - ${bankName}?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setIsProcessing(true);

              // Import getApiUrl từ WalletContext hoặc dùng env trực tiếp
              let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
              
              // Normalize URL: bỏ /api nếu có
              API_URL = API_URL.replace(/\/api\/?$/, '');
              
              const response = await fetch(`${API_URL}/api/wallet/withdraw`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  amount: amountValue,
                  bankInfo: {
                    bankName,
                    accountNumber,
                    accountName,
                  },
                  note,
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || 'Không thể tạo yêu cầu rút tiền');
              }

              if (data.success) {
                Alert.alert(
                  'Thành công',
                  'Yêu cầu rút tiền đã được tạo. Vui lòng đợi xử lý trong 1-3 ngày làm việc.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
              } else {
                throw new Error(data.message || 'Không thể tạo yêu cầu rút tiền');
              }
            } catch (error: any) {
              console.error('Error withdrawing:', error);
              Alert.alert('Lỗi', error.message || 'Không thể tạo yêu cầu rút tiền. Vui lòng thử lại.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const amountValue = amount ? parseInt(amount) : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#f59e0b', '#d97706', '#b45309']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Rút tiền về tài khoản</ThemedText>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Balance Info */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <View style={styles.balanceInfo}>
            <ThemedText style={styles.balanceLabel}>Số dư khả dụng</ThemedText>
            <ThemedText style={styles.balanceAmount}>
              {formatCurrency(wallet?.balance || 0)}
            </ThemedText>
          </View>
        </View>

        {/* Amount Input */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <ThemedText style={styles.sectionTitle}>Số tiền rút</ThemedText>
          
          <View style={styles.amountInputContainer}>
            <TextInput
              style={[
                styles.amountInput,
                { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ddd' },
              ]}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="Nhập số tiền"
              placeholderTextColor={isDark ? '#666' : '#999'}
              keyboardType="numeric"
            />
            <ThemedText style={styles.currencyLabel}>VND</ThemedText>
          </View>

          {amountValue > 0 && (
            <ThemedText style={styles.amountPreview}>
              {formatCurrency(amountValue)}
            </ThemedText>
          )}

          <View style={styles.limitInfo}>
            <Ionicons name="information-circle" size={16} color="#0a7ea4" />
            <ThemedText style={styles.limitText}>
              Số tiền rút tối thiểu: 50,000 VND
            </ThemedText>
          </View>
        </View>

        {/* Bank Info */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <ThemedText style={styles.sectionTitle}>Thông tin ngân hàng</ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Tên ngân hàng</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ddd' },
              ]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="VD: Vietcombank, ACB, ..."
              placeholderTextColor={isDark ? '#666' : '#999'}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Số tài khoản</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ddd' },
              ]}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Nhập số tài khoản"
              placeholderTextColor={isDark ? '#666' : '#999'}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Tên chủ tài khoản</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ddd' },
              ]}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="NGUYEN VAN A"
              placeholderTextColor={isDark ? '#666' : '#999'}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Ghi chú (tùy chọn)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ddd' },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Nhập ghi chú nếu có"
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="warning" size={20} color="#d97706" />
          <ThemedText style={[styles.warningText, { color: '#92400e' }]}>
            Yêu cầu rút tiền sẽ được xử lý trong vòng 1-3 ngày làm việc. Vui lòng kiểm tra kỹ thông tin trước khi xác nhận.
          </ThemedText>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!amount || !bankName || !accountNumber || !accountName || isProcessing) &&
              styles.withdrawButtonDisabled,
          ]}
          onPress={handleWithdraw}
          disabled={!amount || !bankName || !accountNumber || !accountName || isProcessing}
        >
          <LinearGradient
            colors={
              !amount || !bankName || !accountNumber || !accountName || isProcessing
                ? ['#9ca3af', '#6b7280']
                : ['#f59e0b', '#d97706']
            }
            style={styles.withdrawButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cash" size={24} color="#fff" />
                <ThemedText style={styles.withdrawButtonText}>
                  Rút {amountValue > 0 ? formatCurrency(amountValue) : 'tiền'}
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceInfo: {
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f59e0b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.7,
  },
  amountPreview: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    textAlign: 'center',
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  limitText: {
    fontSize: 13,
    opacity: 0.7,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  withdrawButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  withdrawButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  withdrawButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  withdrawButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

