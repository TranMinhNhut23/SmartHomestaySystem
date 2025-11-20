// Helper để normalize URL - chuyển HTTPS sang HTTP cho development
const normalizeUrl = (url: string): string => {
  // Nếu là localhost hoặc IP local và dùng HTTPS, chuyển sang HTTP
  if (url.startsWith('https://')) {
    const isLocal = url.includes('localhost') || 
                   url.includes('127.0.0.1') || 
                   /^https:\/\/192\.168\.\d+\.\d+/.test(url) ||
                   /^https:\/\/10\.\d+\.\d+\.\d+/.test(url);
    if (isLocal) {
      return url.replace('https://', 'http://');
    }
  }
  return url;
};

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = normalizeUrl(rawApiUrl);
const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
const BASE_URL = normalizeUrl(rawBaseUrl);

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

  async register(userData: {
    username: string;
    email: string;
    password: string;
    avatar?: string;
    roleName?: 'user' | 'host';
  }) {
    return this.request<{
      user: any;
      token: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request<any>('/auth/me');
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

  async createPayment(bookingId: string, amount: number, orderInfo?: string) {
    return this.request<any>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({
        bookingId,
        amount,
        orderInfo
      }),
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
}

export const apiService = new ApiService(API_BASE_URL);

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

