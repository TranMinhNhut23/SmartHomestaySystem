import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Google OAuth Configuration
// Web Client ID (cho web và development)
const GOOGLE_WEB_CLIENT_ID = '427675325677-m21ifvu776m66qjntd04omi47q7h5hqh.apps.googleusercontent.com';

// Android Client ID (tạo trong Google Cloud Console với SHA-1 fingerprint)
// Thay YOUR_ANDROID_CLIENT_ID bằng Android Client ID bạn vừa tạo
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

// Complete auth session for WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleAuthResult {
  idToken: string;
  accessToken?: string;
}

/**
 * Đăng nhập bằng Google sử dụng expo-auth-session
 * Tuân thủ OAuth 2.0 policy với Authorization Code Flow + PKCE
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult | null> {
  try {
    console.log('🚀 Starting Google Sign-In...');
    console.log('📱 Platform:', Platform.OS);
    
    // Kiểm tra xem có đang chạy trong Expo Go không
    const isExpoGo = Constants.appOwnership === 'expo';
    console.log('📦 Running in Expo Go:', isExpoGo);
    
    // Chọn Client ID phù hợp
    // Với Android: dùng Android Client ID (không cần redirect URI trong Google Console)
    // Với Web/iOS: dùng Web Client ID
    const clientId = Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID
      ? GOOGLE_ANDROID_CLIENT_ID
      : GOOGLE_WEB_CLIENT_ID;
    
    // Tạo redirect URI đúng chuẩn cho từng platform
    // Với Expo Go: không truyền scheme để dùng exp://
    // Với standalone app: dùng custom scheme
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: isExpoGo ? undefined : 'com.anonymous.frontend',
      path: 'oauth2redirect',
    });
    
    console.log('🔗 Redirect URI:', redirectUri);
    console.log('🔑 Using Client ID:', clientId.substring(0, 20) + '...');
    console.log('🔑 Client Type:', Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID ? 'Android' : 'Web');
    
    // Warning nếu chưa có Android Client ID
    if (Platform.OS === 'android' && !GOOGLE_ANDROID_CLIENT_ID) {
      console.warn('⚠️  Chưa có Android Client ID!');
      console.warn('📋 Vui lòng tạo Android Client ID trong Google Cloud Console');
      console.warn('📋 Xem hướng dẫn trong GOOGLE_OAUTH_EXPO_GO_FIX.md');
    }
    
    // Tạo authorization request với PKCE
    // usePKCE: true sẽ tự động tạo code challenge
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code, // Authorization Code Flow
      usePKCE: true, // Bật PKCE cho bảo mật (tự động tạo code challenge)
      extraParams: {
        access_type: 'offline', // Để lấy refresh token nếu cần
      },
    });

    // Thực hiện authorization
    const result = await request.promptAsync(discovery);

    console.log('🔍 Auth result type:', result.type);

    if (result.type === 'success') {
      console.log('✅ Authorization successful');
      const { code } = result.params;

      if (!code) {
        throw new Error('Không nhận được authorization code từ Google');
      }

      console.log('📝 Got authorization code, exchanging for tokens...');

      // Đổi authorization code lấy tokens
      // Lấy code verifier từ request để verify PKCE
      const codeVerifier = request.codeVerifier;
      
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
          extraParams: codeVerifier ? {
            code_verifier: codeVerifier,
          } : {},
        },
        discovery
      );

      console.log('✅ Token exchange successful');

      if (!tokenResponse.idToken) {
        throw new Error('Không nhận được ID token từ Google');
      }

      return {
        idToken: tokenResponse.idToken,
        accessToken: tokenResponse.accessToken,
      };
    } else if (result.type === 'cancel') {
      console.log('⚠️  User cancelled authentication');
      return null;
    } else if (result.type === 'error') {
      console.error('❌ Authentication error:', result.error);
      throw new Error(result.error?.message || 'Đăng nhập thất bại');
    } else {
      console.error('❌ Authentication failed:', result);
      throw new Error('Đăng nhập bằng Google thất bại');
    }
  } catch (error: any) {
    console.error('❌ Google Sign-In Error:', error);
    
    // Hiển thị lỗi chi tiết cho developer
    if (error.message?.includes('invalid_request')) {
      throw new Error('Cấu hình OAuth không đúng. Vui lòng kiểm tra lại Google Cloud Console.');
    }
    
    throw error;
  }
}

