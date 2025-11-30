import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@/contexts/WalletContext';

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

export default function WalletDepositScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { createDepositMoMo, createDepositVNPay } = useWallet();

  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'momo' | 'vnpay' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value);
  };

  const handleAmountChange = (text: string) => {
    // Chỉ cho phép số
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleDeposit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const amountValue = parseInt(amount);

    if (amountValue < 10000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 10,000 VND');
      return;
    }

    if (amountValue > 50000000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối đa là 50,000,000 VND');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Lỗi', 'Vui lòng chọn phương thức thanh toán');
      return;
    }

    try {
      setIsProcessing(true);

      if (selectedMethod === 'momo') {
        const result = await createDepositMoMo(amountValue);
        
        // MoMo trả về nhiều loại URL:
        // - deeplink: Mở MoMo app (ưu tiên)
        // - payUrl: Mở web payment (fallback)
        const deeplink = result.deeplink;
        const payUrl = result.paymentUrl;
        
        console.log('MoMo deeplink:', deeplink);
        console.log('MoMo payUrl:', payUrl);
        
        let opened = false;
        
        // Thử 1: Mở MoMo app qua deeplink
        if (deeplink) {
          try {
            const canOpen = await Linking.canOpenURL(deeplink);
            if (canOpen) {
              await Linking.openURL(deeplink);
              opened = true;
              console.log('Opened MoMo app via deeplink');
            }
          } catch (err) {
            console.log('Cannot open MoMo app, trying web payment:', err);
          }
        }
        
        // Thử 2: Nếu không mở được app, mở web payment
        if (!opened && payUrl) {
          try {
            const canOpen = await Linking.canOpenURL(payUrl);
            if (canOpen) {
              await Linking.openURL(payUrl);
              opened = true;
              console.log('Opened MoMo web payment');
            }
          } catch (err) {
            console.log('Cannot open MoMo web payment:', err);
          }
        }
        
        if (opened) {
          // Hiển thị thông báo
          Alert.alert(
            'Đang chuyển đến MoMo',
            'Vui lòng hoàn tất thanh toán. Sau khi hoàn tất, bạn có thể quay lại ứng dụng.',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          Alert.alert('Lỗi', 'Không thể mở MoMo. Vui lòng cài đặt ứng dụng MoMo hoặc thử phương thức khác.');
        }
      } else {
        // VNPay - Mở web payment trực tiếp
        const result = await createDepositVNPay(amountValue);
        const paymentUrl = result.paymentUrl;
        
        const supported = await Linking.canOpenURL(paymentUrl);
        if (supported) {
          await Linking.openURL(paymentUrl);
          
          Alert.alert(
            'Đang chuyển đến VNPay',
            'Vui lòng hoàn tất thanh toán. Sau khi hoàn tất, bạn có thể quay lại ứng dụng.',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]
          );
        } else {
          Alert.alert('Lỗi', 'Không thể mở link thanh toán VNPay');
        }
      }
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
    }
  };

  const amountValue = amount ? parseInt(amount) : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#22c55e', '#16a34a', '#15803d']}
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
          <ThemedText style={styles.headerTitle}>Nạp tiền vào ví</ThemedText>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount Input */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <ThemedText style={styles.sectionTitle}>Số tiền nạp</ThemedText>
          
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

          {/* Quick Amounts */}
          <View style={styles.quickAmountsContainer}>
            {QUICK_AMOUNTS.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={[
                  styles.quickAmountButton,
                  {
                    backgroundColor: isDark ? '#262626' : '#f3f4f6',
                    borderColor: amount === quickAmount.toString() ? '#22c55e' : 'transparent',
                  },
                ]}
                onPress={() => handleQuickAmount(quickAmount)}
              >
                <ThemedText style={styles.quickAmountText}>
                  {formatCurrency(quickAmount)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.limitInfo}>
            <Ionicons name="information-circle" size={16} color="#0a7ea4" />
            <ThemedText style={styles.limitText}>
              Giới hạn: 10,000 - 50,000,000 VND
            </ThemedText>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <ThemedText style={styles.sectionTitle}>Phương thức thanh toán</ThemedText>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              {
                backgroundColor: isDark ? '#262626' : '#f3f4f6',
                borderColor: selectedMethod === 'momo' ? '#d82d8b' : 'transparent',
              },
            ]}
            onPress={() => setSelectedMethod('momo')}
          >
            <View style={styles.paymentMethodInfo}>
              <View style={[styles.paymentMethodIcon, { backgroundColor: '#d82d8b' }]}>
                <ThemedText style={styles.paymentMethodIconText}>M</ThemedText>
              </View>
              <View style={styles.paymentMethodText}>
                <ThemedText style={styles.paymentMethodName}>MoMo</ThemedText>
                <ThemedText style={styles.paymentMethodDescription}>
                  Ví điện tử MoMo
                </ThemedText>
              </View>
            </View>
            {selectedMethod === 'momo' && (
              <Ionicons name="checkmark-circle" size={24} color="#d82d8b" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              {
                backgroundColor: isDark ? '#262626' : '#f3f4f6',
                borderColor: selectedMethod === 'vnpay' ? '#0a7ea4' : 'transparent',
              },
            ]}
            onPress={() => setSelectedMethod('vnpay')}
          >
            <View style={styles.paymentMethodInfo}>
              <View style={[styles.paymentMethodIcon, { backgroundColor: '#0a7ea4' }]}>
                <ThemedText style={styles.paymentMethodIconText}>V</ThemedText>
              </View>
              <View style={styles.paymentMethodText}>
                <ThemedText style={styles.paymentMethodName}>VNPay</ThemedText>
                <ThemedText style={styles.paymentMethodDescription}>
                  Cổng thanh toán VNPay
                </ThemedText>
              </View>
            </View>
            {selectedMethod === 'vnpay' && (
              <Ionicons name="checkmark-circle" size={24} color="#0a7ea4" />
            )}
          </TouchableOpacity>
        </View>

        {/* Deposit Button */}
        <TouchableOpacity
          style={[
            styles.depositButton,
            (!amount || !selectedMethod || isProcessing) && styles.depositButtonDisabled,
          ]}
          onPress={handleDeposit}
          disabled={!amount || !selectedMethod || isProcessing}
        >
          <LinearGradient
            colors={
              !amount || !selectedMethod || isProcessing
                ? ['#9ca3af', '#6b7280']
                : ['#22c55e', '#16a34a']
            }
            style={styles.depositButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="card" size={24} color="#fff" />
                <ThemedText style={styles.depositButtonText}>
                  Nạp {amountValue > 0 ? formatCurrency(amountValue) : 'tiền'}
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
    color: '#22c55e',
    textAlign: 'center',
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
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
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  paymentMethodText: {
    gap: 2,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethodDescription: {
    fontSize: 13,
    opacity: 0.7,
  },
  depositButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  depositButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  depositButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  depositButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

