import { Platform } from 'react-native';

// Helper để normalize URL - chuyển HTTPS sang HTTP cho development
const normalizeUrl = (url: string): string => {
  // Nếu là localhost hoặc IP local và dùng HTTPS, chuyển sang HTTP
  // KHÔNG chuyển nếu là ngrok hoặc domain thật
  if (url.startsWith('https://')) {
    const isLocal = url.includes('localhost') || 
                   url.includes('127.0.0.1') || 
                   /^https:\/\/192\.168\.\d+\.\d+/.test(url) ||
                   /^https:\/\/10\.\d+\.\d+\.\d+/.test(url);
    const isNgrok = url.includes('ngrok');
    
    // Chỉ chuyển sang http nếu là local và KHÔNG phải ngrok
    if (isLocal && !isNgrok) {
      return url.replace('https://', 'http://');
    }
  }
  return url;
};

// Hàm để lấy API URL phù hợp với platform
const getDefaultApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Default URLs cho development
  // Android emulator không thể dùng localhost, cần dùng 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  
  // iOS simulator và web có thể dùng localhost
  return 'http://localhost:5000/api';
};

const rawApiUrl = getDefaultApiUrl();
const API_BASE_URL = normalizeUrl(rawApiUrl);
const rawBaseUrl = rawApiUrl.replace('/api', '');
const BASE_URL = normalizeUrl(rawBaseUrl);

console.log('=== API Service Initialized ===');
console.log('Platform:', Platform.OS);
console.log('API_BASE_URL:', API_BASE_URL);
console.log('BASE_URL:', BASE_URL);
console.log('==============================');

// Helper để lấy full URL của avatar
export const getAvatarUrl = (avatar: string | null | undefined): string | null => {
  if (!avatar) return null;
  
  // Nếu đã là full URL hoặc base64, trả về nguyên
  if (avatar.startsWith('http') || avatar.startsWith('data:image')) {
    return avatar;
  }
  
  // Nếu là relative URL, thêm base URL
  if (avatar.startsWith('/')) {
    return `${BASE_URL}${avatar}`;
  }
  
  // Nếu chỉ là filename, thêm path
  return `${BASE_URL}/uploads/avatars/${avatar}`;
};

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      // Lưu token vào AsyncStorage nếu cần
      // AsyncStorage.setItem('token', token);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      // Thêm timeout cho request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        cache: 'no-store', // Disable cache cho tất cả requests
      });

      clearTimeout(timeoutId);

      // Kiểm tra content-type trước khi parse JSON
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          const text = await response.text();
          console.error('JSON Parse Error:', text);
          throw new Error(`Lỗi phản hồi từ server: ${text.substring(0, 100)}`);
        }
      } else {
        const text = await response.text();
        console.error('Non-JSON Response:', text);
        throw new Error(`Server trả về định dạng không hợp lệ: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        // Log error để debug
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url,
          data,
        });
        throw new Error(data.message || `Lỗi ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error: any) {
      // Xử lý các loại lỗi khác nhau
      console.error('Request Error:', {
        url,
        error: error.message,
        name: error.name,
      });

      // Lỗi timeout
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }

      // Lỗi network (fetch failed)
      if (error.message?.includes('fetch') || 
          error.message?.includes('Network') || 
          error.name === 'TypeError') {
        const isHttps = url.startsWith('https://');
        const errorMsg = isHttps 
          ? `Không thể kết nối đến server.\n\n` +
            `URL hiện tại: ${url}\n\n` +
            `Có thể do:\n` +
            `1. Backend không hỗ trợ HTTPS - hãy đổi EXPO_PUBLIC_API_URL sang http:// thay vì https://\n` +
            `2. Backend chưa chạy hoặc không thể truy cập\n` +
            `3. Kiểm tra firewall và kết nối mạng\n` +
            `4. Nếu dùng thiết bị thật, đảm bảo thiết bị và máy tính cùng mạng`
          : `Không thể kết nối đến server.\n\n` +
            `URL: ${url}\n\n` +
            `Vui lòng kiểm tra:\n` +
            `1. Backend đang chạy tại ${url.replace('/api', '')}\n` +
            `2. Nếu dùng thiết bị thật, đảm bảo thiết bị và máy tính cùng mạng\n` +
            `3. Kiểm tra firewall và kết nối mạng`;
        throw new Error(errorMsg);
      }

      // Nếu đã có message từ error
      if (error.message) {
        throw error;
      }

      throw new Error('Có lỗi xảy ra. Vui lòng thử lại sau.');
    }
  }

  // Generic HTTP methods
  async get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  async post<T = any>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{
      user: any;
      token: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async sendRegistrationOTP(userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    avatar?: string;
    roleName?: 'user' | 'host';
  }) {
    return this.request<{
      email: string;
    }>('/auth/register/send-otp', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async verifyOTP(email: string, otpCode: string) {
    return this.request<{
      user: any;
      token: string;
      refreshToken: string;
    }>('/auth/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
  }

  async resendOTP(email: string) {
    return this.request('/auth/register/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    avatar?: string;
    roleName?: 'user' | 'host';
  }) {
    // Backward compatibility - redirect to sendOTP
    return this.sendRegistrationOTP(userData);
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
  }

  async updateProfile(userId: string | null, profileData: {
    username?: string;
    email?: string;
    phone?: string | null;
    avatar?: string | null;
    emailChangeOTPVerified?: boolean;
  }) {
    const endpoint = userId ? `/auth/profile/${userId}` : '/auth/profile';
    return this.request<any>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Email change OTP APIs
  async sendEmailChangeOTP(newEmail: string) {
    return this.request<any>('/auth/email-change/send-otp', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
  }

  async verifyEmailChangeOTP(newEmail: string, otpCode: string) {
    return this.request<any>('/auth/email-change/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ newEmail, otpCode }),
    });
  }

  async resendEmailChangeOTP(newEmail: string) {
    return this.request<any>('/auth/email-change/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
  }

  // Forgot password APIs
  async generateCaptcha() {
    return this.request<{
      sessionId: string;
      question: string;
    }>('/auth/forgot-password/captcha', {
      method: 'GET',
    });
  }

  async requestPasswordReset(identifier: string, captchaSessionId: string, captchaAnswer: string) {
    return this.request<{
      email: string;
    }>('/auth/forgot-password/request', {
      method: 'POST',
      body: JSON.stringify({ identifier, captchaSessionId, captchaAnswer }),
    });
  }

  async verifyPasswordResetOTP(email: string, otpCode: string) {
    return this.request<{
      userId: string;
    }>('/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
  }

  async resetPassword(email: string, otpCode: string, newPassword: string, confirmPassword: string) {
    return this.request('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode, newPassword, confirmPassword }),
    });
  }

  async resendPasswordResetOTP(identifier: string) {
    return this.request('/auth/forgot-password/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }

  async loginWithGoogle(idToken: string) {
    return this.request<{
      user: any;
      token: string;
      refreshToken: string;
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }

  // Homestay endpoints
  async getProvinces() {
    return this.request<any>('/homestays/provinces', {
      method: 'GET',
    });
  }

  async getDistricts(provinceCode: string) {
    return this.request<any>(`/homestays/provinces/${provinceCode}/districts`, {
      method: 'GET',
    });
  }

  async getWards(districtCode: string) {
    return this.request<any>(`/homestays/districts/${districtCode}/wards`, {
      method: 'GET',
    });
  }

  async createHomestay(homestayData: {
    name: string;
    description: string;
    address: {
      province: { code: string; name: string };
      district: { code: string; name: string };
      ward: { code: string; name: string };
      street: string;
    };
    googleMapsEmbed?: string;
    pricePerNight?: number;
    images: string[];
    featured: boolean;
    requireDeposit: boolean;
    rooms: Array<{
      type: string;
      quantity: number;
      pricePerNight: number;
      roomNames: string[];
    }>;
    amenities: string[];
  }) {
    return this.request<any>('/homestays', {
      method: 'POST',
      body: JSON.stringify(homestayData),
    });
  }

  async getHostHomestays(params?: {
    status?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.featured !== undefined) queryParams.append('featured', params.featured.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/homestays/my-homestays${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getAllHomestays(params?: {
    featured?: boolean;
    province?: string;
    district?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.featured !== undefined) queryParams.append('featured', params.featured.toString());
    if (params?.province) queryParams.append('province', params.province);
    if (params?.district) queryParams.append('district', params.district);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/homestays${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getHomestayById(id: string) {
    return this.request<any>(`/homestays/${id}`, {
      method: 'GET',
    });
  }

  async getHomestayWeather(homestayId: string) {
    return this.request<any>(`/homestays/${homestayId}/weather`, {
      method: 'GET',
    });
  }

  async updateHomestay(id: string, homestayData: {
    name?: string;
    description?: string;
    address?: any;
    googleMapsEmbed?: string;
    pricePerNight?: number;
    images?: string[];
    featured?: boolean;
    requireDeposit?: boolean;
    rooms?: Array<{
      type: string;
      quantity: number;
      pricePerNight: number;
      roomNames: string[];
    }>;
    amenities?: string[];
  }) {
    return this.request<any>(`/homestays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(homestayData),
    });
  }

  // Booking APIs
  async createBooking(bookingData: {
    homestayId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    numberOfGuests: number;
    guestInfo?: {
      fullName?: string;
      phone?: string;
      email?: string;
      specialRequests?: string;
    };
  }) {
    return this.request<any>('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getGuestBookings(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/bookings/my-bookings${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getHostBookings(params?: {
    status?: string;
    homestayId?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.homestayId) queryParams.append('homestayId', params.homestayId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/bookings/host-bookings${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  // Admin endpoints - Get all bookings
  async getAllBookings(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/bookings/admin-bookings${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getBookingById(id: string) {
    return this.request<any>(`/bookings/${id}`, {
      method: 'GET',
    });
  }

  async updateBookingStatus(id: string, status: string) {
    return this.request<any>(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async checkRoomAvailability(roomId: string, checkIn: string, checkOut: string) {
    const queryParams = new URLSearchParams();
    queryParams.append('roomId', roomId);
    queryParams.append('checkIn', checkIn);
    queryParams.append('checkOut', checkOut);
    
    return this.request<any>(`/bookings/check-availability?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // Refund-related methods
  async getRefundableBookings() {
    return this.request<any>('/bookings/refundable', {
      method: 'GET',
    });
  }

  async requestRefund(bookingId: string, reason: string) {
    return this.request<any>(`/bookings/${bookingId}/request-refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Host: Get refund requests for host's homestays
  async getHostRefundRequests(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return this.request<any>(`/bookings/host-refund-requests?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  // Host: Process refund request (approve/reject)
  async processHostRefund(bookingId: string, action: 'approve' | 'reject', adminNote?: string) {
    return this.request<any>(`/bookings/${bookingId}/process-host-refund`, {
      method: 'POST',
      body: JSON.stringify({ action, adminNote }),
    });
  }

  async getRefundRequests(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/bookings/refund-requests${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async processManualRefund(bookingId: string, reason: string, percentage: number) {
    return this.request<any>(`/bookings/${bookingId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason, percentage }),
    });
  }

  async createPayment(bookingId: string, amount: number, orderInfo?: string, paymentMethod: 'momo' | 'vnpay' = 'momo') {
    // Chọn endpoint dựa trên payment method
    const endpoint = paymentMethod === 'vnpay' 
      ? '/payments/vnpay/create' 
      : '/payments/create';
    
    return this.request<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        amount,
        orderInfo
      }),
    });
  }

  // Wallet methods
  async getWallet() {
    return this.request<any>('/wallet', {
      method: 'GET',
    });
  }

  async payBookingWithWallet(bookingId: string) {
    return this.request<any>(`/bookings/${bookingId}/pay-with-wallet`, {
      method: 'POST',
    });
  }

  // Admin endpoints - Homestay approval
  async getPendingHomestays(params?: {
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/homestays/pending${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async approveHomestay(id: string) {
    return this.request<any>(`/homestays/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectHomestay(id: string, reason?: string) {
    return this.request<any>(`/homestays/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Host Request endpoints
  async createHostRequest(requestData: {
    fullName: string;
    dateOfBirth: string;
    address: string;
    idCardFront: string;
    idCardBack: string;
    reason: string;
    homestayProof: string;
    termsAccepted: boolean;
  }) {
    return this.request<any>('/host-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getMyHostRequest() {
    return this.request<any>('/host-requests/my-request', {
      method: 'GET',
    });
  }

  async getHostRequestById(id: string) {
    return this.request<any>(`/host-requests/${id}`, {
      method: 'GET',
    });
  }

  // Admin endpoints - Host Request management
  async getAllHostRequests(params?: {
    status?: 'pending' | 'approved' | 'rejected';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const endpoint = `/host-requests${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async approveHostRequest(id: string) {
    return this.request<any>(`/host-requests/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectHostRequest(id: string, reason?: string) {
    return this.request<any>(`/host-requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Coupon endpoints
  async validateCoupon(code: string, totalPrice: number, homestayId?: string) {
    return this.request<any>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, totalPrice, homestayId }),
    });
  }

  async getActiveCoupons() {
    return this.request<any>('/coupons/active', {
      method: 'GET',
    });
  }

  // Admin endpoints - Coupon management
  async createCoupon(couponData: {
    name: string;
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    maxDiscount?: number;
    minOrder?: number;
    maxUsagePerUser?: number;
    maxUsageTotal?: number;
    startDate: string;
    endDate: string;
    status?: 'active' | 'inactive';
  }) {
    return this.request<any>('/coupons', {
      method: 'POST',
      body: JSON.stringify(couponData),
    });
  }

  async getAllCoupons(params?: {
    status?: 'active' | 'inactive';
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/coupons${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getCouponById(id: string) {
    return this.request<any>(`/coupons/${id}`, {
      method: 'GET',
    });
  }

  async updateCoupon(id: string, couponData: any) {
    return this.request<any>(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(couponData),
    });
  }

  async deleteCoupon(id: string) {
    return this.request<any>(`/coupons/${id}`, {
      method: 'DELETE',
    });
  }

  // Review endpoints
  async createReview(reviewData: {
    bookingId: string;
    rating: number;
    comment?: string;
    images?: string[];
    videos?: string[];
    details?: {
      cleanliness?: number;
      location?: number;
      value?: number;
      service?: number;
    };
    isPublic?: boolean;
  }) {
    return this.request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  async updateReview(reviewId: string, reviewData: {
    rating?: number;
    comment?: string;
    images?: string[];
    videos?: string[];
    details?: {
      cleanliness?: number;
      location?: number;
      value?: number;
      service?: number;
    };
    isPublic?: boolean;
  }) {
    return this.request<any>(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async getReviewById(reviewId: string) {
    return this.request<any>(`/reviews/${reviewId}`, {
      method: 'GET',
    });
  }

  async getReviewByBookingId(bookingId: string) {
    return this.request<any>(`/reviews/booking/${bookingId}`, {
      method: 'GET',
    });
  }

  async getHomestayReviews(homestayId: string, params?: {
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.rating) queryParams.append('rating', params.rating.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const endpoint = `/reviews/homestay/${homestayId}${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async getMyReviews(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const endpoint = `/reviews/my-reviews${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
    });
  }

  async deleteReview(reviewId: string) {
    return this.request<any>(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  // Notification APIs
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: string;
    role?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.role) queryParams.append('role', params.role);
    // Thêm timestamp để bypass cache
    queryParams.append('t', new Date().getTime().toString());
    
    const queryString = queryParams.toString();
    const endpoint = `/notifications${queryString ? `?${queryString}` : ''}`;
    
    return this.request<any>(endpoint, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
  }

  async getUnreadNotificationCount() {
    // Thêm timestamp để bypass cache
    const timestamp = new Date().getTime();
    return this.request<{ count: number }>(`/notifications/unread-count?t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<any>('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // Chat APIs
  async getUserChats(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return this.request<any>(`/chats/my-chats${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  }

  async getChatById(chatId: string) {
    return this.request<any>(`/chats/${chatId}`, {
      method: 'GET',
    });
  }

  async getChatMessages(chatId: string, params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    return this.request<any>(`/chats/${chatId}/messages${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  }

  async sendMessage(chatId: string, content: string, type: string = 'text') {
    return this.request<any>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async markChatAsRead(chatId: string) {
    return this.request<any>(`/chats/${chatId}/read`, {
      method: 'PUT',
    });
  }

  async getUnreadChatCount() {
    return this.request<{ unreadCount: number }>('/chats/unread-count', {
      method: 'GET',
    });
  }

  async findOrCreateChat(hostId: string, homestayId: string) {
    return this.request<any>('/chats/find-or-create', {
      method: 'POST',
      body: JSON.stringify({ hostId, homestayId }),
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request<any>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async deleteAllReadNotifications() {
    return this.request<any>('/notifications/read/delete-all', {
      method: 'DELETE',
    });
  }

  // Admin APIs - User Management
  async getAllUsers(params?: {
    roleName?: 'user' | 'host' | 'admin';
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (params?.roleName) queryParams.append('roleName', params.roleName);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    return this.request<any>(`/admin/users${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  }

  async getUserById(userId: string) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'GET',
    });
  }

  async updateUser(userId: string, userData: {
    username?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    roleName?: 'user' | 'host' | 'admin';
  }) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async toggleUserStatus(userId: string) {
    return this.request<any>(`/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
    });
  }

  async deleteUser(userId: string) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Admin APIs - Statistics
  async getDashboardStats() {
    return this.request<any>('/admin/stats/dashboard', {
      method: 'GET',
    });
  }

  async getRevenueStats(params?: {
    period?: 'day' | 'month';
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    return this.request<any>(`/admin/stats/revenue${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  }

  // Admin APIs - Maintenance Fee
  async processMaintenanceFeeManually() {
    return this.request<any>('/admin/maintenance-fee/process', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
export { BASE_URL };

// Helper để lấy full URL của ảnh homestay
export const getHomestayImageUrl = (image: string | null | undefined): string | null => {
  if (!image) return null;
  
  // Nếu đã là full URL hoặc base64, trả về nguyên
  if (image.startsWith('http') || image.startsWith('data:image')) {
    return image;
  }
  
  // Nếu là relative URL, thêm base URL
  if (image.startsWith('/')) {
    return `${BASE_URL}${image}`;
  }
  
  // Nếu chỉ là filename, thêm path
  return `${BASE_URL}/uploads/homestays/${image}`;
};

// Helper để lấy full URL của ảnh ID card
export const getIdCardImageUrl = (image: string | null | undefined): string | null => {
  if (!image) return null;
  
  // Nếu đã là full URL hoặc base64, trả về nguyên
  if (image.startsWith('http') || image.startsWith('data:image')) {
    return image;
  }
  
  // Nếu là relative URL, thêm base URL
  if (image.startsWith('/')) {
    return `${BASE_URL}${image}`;
  }
  
  // Nếu chỉ là filename, thêm path
  return `${BASE_URL}/uploads/idcards/${image}`;
};

// Helper để lấy full URL của ảnh review
export const getReviewImageUrl = (image: string | null | undefined): string | null => {
  if (!image) return null;
  
  // Nếu đã là full URL hoặc base64, trả về nguyên
  if (image.startsWith('http') || image.startsWith('data:image')) {
    return image;
  }
  
  // Nếu là relative URL, thêm base URL
  if (image.startsWith('/')) {
    return `${BASE_URL}${image}`;
  }
  
  // Nếu chỉ là filename, thêm path
  return `${BASE_URL}/uploads/reviews/${image}`;
};
