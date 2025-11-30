import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricType {
  available: boolean;
  type: 'fingerprint' | 'facial' | 'iris' | 'none';
  error?: string;
}

/**
 * Kiểm tra xem thiết bị có hỗ trợ biometric authentication không
 */
export async function checkBiometricAvailability(): Promise<BiometricType> {
  try {
    // Kiểm tra xem có biometric hardware không
    const compatible = await LocalAuthentication.hasHardwareAsync();
    
    if (!compatible) {
      return {
        available: false,
        type: 'none',
        error: 'Thiết bị không hỗ trợ xác thực sinh trắc học'
      };
    }

    // Kiểm tra xem có biometric data được đăng ký không
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!enrolled) {
      return {
        available: false,
        type: 'none',
        error: 'Chưa đăng ký vân tay/face ID trên thiết bị'
      };
    }

    // Lấy danh sách các loại biometric được hỗ trợ
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';
    
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      available: true,
      type: biometricType
    };
  } catch (error: any) {
    return {
      available: false,
      type: 'none',
      error: error.message || 'Lỗi kiểm tra xác thực sinh trắc học'
    };
  }
}

/**
 * Lấy tên hiển thị của loại biometric
 */
export function getBiometricName(type: 'fingerprint' | 'facial' | 'iris' | 'none'): string {
  switch (type) {
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Vân tay';
    case 'facial':
      return Platform.OS === 'ios' ? 'Face ID' : 'Nhận diện khuôn mặt';
    case 'iris':
      return 'Iris';
    default:
      return 'Sinh trắc học';
  }
}

/**
 * Xác thực bằng biometric (fingerprint/face ID)
 */
export async function authenticateWithBiometric(
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultReason = Platform.OS === 'ios' 
      ? 'Xác thực để đăng nhập' 
      : 'Xác thực bằng vân tay để đăng nhập';

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason || defaultReason,
      cancelLabel: 'Hủy',
      disableDeviceFallback: false, // Cho phép dùng PIN/password nếu biometric fail
      fallbackLabel: Platform.OS === 'ios' ? 'Dùng mật khẩu' : 'Dùng mật khẩu',
    });

    if (result.success) {
      return { success: true };
    } else {
      let errorMessage = 'Xác thực thất bại';
      
      if (result.error === 'user_cancel') {
        errorMessage = 'Đã hủy xác thực';
      } else if (result.error === 'user_fallback') {
        errorMessage = 'Đã chuyển sang mật khẩu';
      } else if (result.error === 'system_cancel') {
        errorMessage = 'Hệ thống đã hủy xác thực';
      } else if (result.error === 'not_available') {
        errorMessage = 'Xác thực sinh trắc học không khả dụng';
      } else if (result.error === 'not_enrolled') {
        errorMessage = 'Chưa đăng ký vân tay/face ID';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Lỗi xác thực sinh trắc học'
    };
  }
}

/**
 * Kiểm tra xem có thể sử dụng biometric không (có hardware và đã enroll)
 */
export async function canUseBiometric(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    return false;
  }
}

















