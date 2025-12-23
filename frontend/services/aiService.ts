
import Constants from 'expo-constants';
import { apiService } from './api';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_details?: any;
}

export interface AIResponse {
  content: string;
  reasoning_details?: any;
}

// Interfaces cho database context
export interface HomestayContext {
  _id: string;
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
  amenities: string[];
  averageRating?: number;
  reviewCount?: number;
  rooms?: RoomContext[];
}

export interface RoomContext {
  _id: string;
  name: string;
  type: string;
  pricePerNight: number;
  maxGuests: number;
  status: string;
}

export interface BookingContext {
  _id: string;
  homestay: HomestayContext;
  room: RoomContext;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  guestInfo?: {
    fullName?: string;
    phone?: string;
    email?: string;
    specialRequests?: string;
  };
}

export interface ReviewContext {
  _id: string;
  rating: number;
  comment?: string;
  details?: {
    cleanliness?: number;
    location?: number;
    value?: number;
    service?: number;
  };
  guest?: {
    username: string;
  };
  createdAt: string;
}

export interface CouponContext {
  _id: string;
  name: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrder?: number;
  startDate: string;
  endDate: string;
  status: string;
}

class AIService {
  private apiKey: string | null = null;

  setApiKey(apiKey: string | null) {
    this.apiKey = apiKey;
  }

  // ========== DATABASE DATA FETCHING METHODS ==========

  /**
   * Lấy thông tin homestay từ database
   */
  async fetchHomestayData(homestayId: string): Promise<HomestayContext | null> {
    try {
      const response = await apiService.getHomestayById(homestayId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching homestay data:', error);
      return null;
    }
  }

  /**
   * Lấy thông tin booking từ database
   */
  async fetchBookingData(bookingId: string): Promise<BookingContext | null> {
    try {
      const response = await apiService.getBookingById(bookingId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching booking data:', error);
      return null;
    }
  }

  /**
   * Lấy danh sách reviews của homestay
   */
  async fetchHomestayReviews(homestayId: string, limit: number = 10): Promise<ReviewContext[]> {
    try {
      const response = await apiService.getHomestayReviews(homestayId, {
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (response.success && response.data) {
        return response.data.reviews || response.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching homestay reviews:', error);
      return [];
    }
  }

  /**
   * Lấy danh sách coupons đang active
   */
  async fetchActiveCoupons(): Promise<CouponContext[]> {
    try {
      const response = await apiService.getActiveCoupons();
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : response.data.coupons || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching active coupons:', error);
      return [];
    }
  }

  // ========== DATA FORMATTING METHODS ==========

  /**
   * Format homestay data thành context string
   */
  formatHomestayContext(homestay: HomestayContext): string {
    const address = homestay.address
      ? `${homestay.address.street}, ${homestay.address.ward.name}, ${homestay.address.district.name}, ${homestay.address.province.name}`
      : 'N/A';

    let context = `🏠 **THÔNG TIN HOMESTAY:**
- Tên: ${homestay.name}
- Địa chỉ: ${address}
- Mô tả: ${homestay.description || 'Chưa có mô tả'}`;

    if (homestay.averageRating) {
      context += `\n- Đánh giá: ${homestay.averageRating}/5 (${homestay.reviewCount || 0} đánh giá)`;
    }

    if (homestay.amenities && homestay.amenities.length > 0) {
      context += `\n- Tiện ích: ${homestay.amenities.join(', ')}`;
    }

    if (homestay.rooms && homestay.rooms.length > 0) {
      context += `\n\n📦 **PHÒNG CÓ SẴN:**`;
      homestay.rooms.forEach((room, index) => {
        context += `\n${index + 1}. ${room.name} (${room.type}) - ${room.pricePerNight.toLocaleString('vi-VN')}đ/đêm - Tối đa ${room.maxGuests} khách`;
      });
    } else if (homestay.pricePerNight) {
      context += `\n- Giá: ${homestay.pricePerNight.toLocaleString('vi-VN')}đ/đêm`;
    }

    return context;
  }

  /**
   * Format booking data thành context string
   */
  formatBookingContext(booking: BookingContext): string {
    const checkIn = new Date(booking.checkIn).toLocaleDateString('vi-VN');
    const checkOut = new Date(booking.checkOut).toLocaleDateString('vi-VN');
    const nights = Math.ceil(
      (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );

    let context = `📅 **THÔNG TIN ĐẶT PHÒNG:**
- Homestay: ${booking.homestay?.name || 'N/A'}
- Phòng: ${booking.room?.name || 'N/A'} (${booking.room?.type || 'N/A'})
- Ngày nhận phòng: ${checkIn}
- Ngày trả phòng: ${checkOut}
- Số đêm: ${nights} đêm
- Số khách: ${booking.numberOfGuests} người
- Tổng giá: ${booking.totalPrice.toLocaleString('vi-VN')}đ
- Trạng thái: ${this.getStatusText(booking.status)}
- Trạng thái thanh toán: ${this.getPaymentStatusText(booking.paymentStatus)}`;

    if (booking.guestInfo?.specialRequests) {
      context += `\n- Yêu cầu đặc biệt: ${booking.guestInfo.specialRequests}`;
    }

    return context;
  }

  /**
   * Format reviews thành context string
   */
  formatReviewsContext(reviews: ReviewContext[]): string {
    if (!reviews || reviews.length === 0) {
      return '📝 **ĐÁNH GIÁ:** Chưa có đánh giá nào.';
    }

    let context = `📝 **ĐÁNH GIÁ CỦA KHÁCH HÀNG (${reviews.length} đánh giá gần nhất):**\n\n`;

    reviews.slice(0, 5).forEach((review, index) => {
      const date = new Date(review.createdAt).toLocaleDateString('vi-VN');
      context += `${index + 1}. ⭐ ${review.rating}/5`;
      if (review.guest?.username) {
        context += ` - ${review.guest.username}`;
      }
      context += ` (${date})`;
      if (review.comment) {
        context += `\n   "${review.comment}"`;
      }
      if (review.details) {
        const details = [];
        if (review.details.cleanliness) details.push(`Sạch sẽ: ${review.details.cleanliness}/5`);
        if (review.details.location) details.push(`Vị trí: ${review.details.location}/5`);
        if (review.details.value) details.push(`Giá trị: ${review.details.value}/5`);
        if (review.details.service) details.push(`Dịch vụ: ${review.details.service}/5`);
        if (details.length > 0) {
          context += `\n   Chi tiết: ${details.join(', ')}`;
        }
      }
      context += '\n\n';
    });

    return context.trim();
  }

  /**
   * Format coupons thành context string
   */
  formatCouponsContext(coupons: CouponContext[]): string {
    if (!coupons || coupons.length === 0) {
      return '🎫 **MÃ GIẢM GIÁ:** Hiện tại không có mã giảm giá nào.';
    }

    let context = `🎫 **MÃ GIẢM GIÁ ĐANG ÁP DỤNG (${coupons.length} mã):**\n\n`;

    coupons.slice(0, 5).forEach((coupon, index) => {
      const startDate = new Date(coupon.startDate).toLocaleDateString('vi-VN');
      const endDate = new Date(coupon.endDate).toLocaleDateString('vi-VN');
      const discountText =
        coupon.discountType === 'percent'
          ? `Giảm ${coupon.discountValue}%`
          : `Giảm ${coupon.discountValue.toLocaleString('vi-VN')}đ`;

      context += `${index + 1}. ${coupon.name} (${coupon.code})\n`;
      context += `   ${discountText}`;
      if (coupon.maxDiscount) {
        context += ` (Tối đa ${coupon.maxDiscount.toLocaleString('vi-VN')}đ)`;
      }
      if (coupon.minOrder) {
        context += ` - Áp dụng cho đơn từ ${coupon.minOrder.toLocaleString('vi-VN')}đ`;
      }
      context += `\n   Thời gian: ${startDate} - ${endDate}\n\n`;
    });

    return context.trim();
  }

  /**
   * Build full context từ database data
   */
  async buildDatabaseContext(options: {
    homestayId?: string;
    bookingId?: string;
    includeReviews?: boolean;
    includeCoupons?: boolean;
  }): Promise<string> {
    const contexts: string[] = [];

    // Fetch homestay data
    if (options.homestayId) {
      const homestay = await this.fetchHomestayData(options.homestayId);
      if (homestay) {
        contexts.push(this.formatHomestayContext(homestay));

        // Fetch reviews nếu cần
        if (options.includeReviews !== false) {
          const reviews = await this.fetchHomestayReviews(options.homestayId);
          contexts.push(this.formatReviewsContext(reviews));
        }
      }
    }

    // Fetch booking data
    if (options.bookingId) {
      const booking = await this.fetchBookingData(options.bookingId);
      if (booking) {
        contexts.push(this.formatBookingContext(booking));

        // Nếu booking có homestay, fetch thêm thông tin homestay nếu chưa có
        if (booking.homestay && !options.homestayId) {
          contexts.unshift(this.formatHomestayContext(booking.homestay));
        }
      }
    }

    // Fetch coupons nếu cần
    if (options.includeCoupons) {
      const coupons = await this.fetchActiveCoupons();
      contexts.push(this.formatCouponsContext(coupons));
    }

    return contexts.join('\n\n');
  }

  // Helper methods
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Đang chờ xác nhận',
      confirmed: 'Đã xác nhận',
      cancelled: 'Đã hủy',
      completed: 'Đã hoàn thành',
    };
    return statusMap[status] || status;
  }

  private getPaymentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Chưa thanh toán',
      paid: 'Đã thanh toán',
      failed: 'Thanh toán thất bại',
      refunded: 'Đã hoàn tiền',
      partial_refunded: 'Hoàn tiền một phần',
    };
    return statusMap[status] || status;
  }

  // System prompt để giới hạn AI chỉ trả lời về du lịch
  getSystemPrompt(
    homestayName?: string,
    homestayAddress?: string,
    databaseContext?: string
  ): string {
    let contextSection = '';

    if (databaseContext) {
      contextSection = `\n\n**DỮ LIỆU TỪ HỆ THỐNG (CẬP NHẬT THEO THỜI GIAN THỰC):**\n${databaseContext}\n\n`;
    } else if (homestayName && homestayAddress) {
      contextSection = `\n\n**THÔNG TIN CONTEXT:**
- Homestay: ${homestayName}
- Địa chỉ: ${homestayAddress}
- Bạn đang hỗ trợ khách hàng lập kế hoạch chuyến đi đến homestay này.\n\n`;
    }

    return `Bạn là một trợ lý du lịch AI chuyên nghiệp trong hệ thống Smart Homestay System. 

**QUAN TRỌNG - QUY TẮC ỨNG XỬ:**
1. BẠN CHỈ ĐƯỢC PHÉP trả lời các câu hỏi và thảo luận LIÊN QUAN ĐẾN DU LỊCH, homestay, và chuyến đi của khách hàng.
2. CÁC CHỦ ĐỀ ĐƯỢC PHÉP:
   - Lịch trình du lịch và gợi ý điểm tham quan
   - Nhà hàng, quán ăn, ẩm thực địa phương
   - Hoạt động vui chơi giải trí
   - Phương tiện di chuyển và logistics
   - Thông tin về homestay và địa phương
   - Thời tiết, thời gian tốt nhất để đi du lịch
   - Văn hóa địa phương và lễ hội
   - Lưu ý an toàn khi du lịch
   - Gợi ý quà lưu niệm và shopping
   - Tips và mẹo du lịch

3. CÁC CHỦ ĐỀ KHÔNG ĐƯỢC PHÉP - BẠN PHẢI TỪ CHỐI:
   - Câu hỏi về công nghệ, lập trình, code
   - Câu hỏi về chính trị, tôn giáo
   - Câu hỏi về y tế, bệnh tật (trừ khi liên quan đến chuẩn bị cho chuyến đi)
   - Câu hỏi về tài chính, đầu tư (trừ giá cả dịch vụ du lịch)
   - Câu hỏi cá nhân không liên quan đến chuyến đi
   - Câu hỏi về các chủ đề ngoài phạm vi du lịch

4. KHI NHẬN ĐƯỢC CÂU HỎI NGOÀI PHẠM VI:
   - Lịch sự từ chối: "Xin lỗi, tôi chỉ có thể hỗ trợ bạn về các vấn đề liên quan đến du lịch, homestay và lịch trình chuyến đi. Bạn có câu hỏi nào về du lịch không?"
   - Đề xuất quay lại chủ đề du lịch
   - KHÔNG trả lời câu hỏi, dù chỉ một phần

5. SỬ DỤNG DỮ LIỆU TỪ HỆ THỐNG:
   - Bạn có quyền truy cập vào dữ liệu thực tế từ hệ thống (thông tin homestay, booking, reviews, coupons)
   - Hãy sử dụng thông tin này để đưa ra câu trả lời chính xác và cụ thể
   - Khi khách hỏi về giá cả, phòng, đánh giá, hãy tham khảo dữ liệu từ hệ thống
   - Nếu có booking cụ thể, hãy tham khảo thông tin booking để đưa ra gợi ý phù hợp${contextSection}Hãy luôn giữ thái độ thân thiện, nhiệt tình và chuyên nghiệp, nhưng tuân thủ nghiêm ngặt các quy tắc trên.`;
  }

  // Kiểm tra câu hỏi có liên quan đến du lịch không
  isTravelRelated(message: string): boolean {
    const travelKeywords = [
      'du lịch', 'travel', 'trip', 'journey', 'vacation', 'holiday',
      'lịch trình', 'itinerary', 'schedule', 'plan', 'kế hoạch',
      'homestay', 'khách sạn', 'hotel', 'resort', 'accommodation',
      'điểm tham quan', 'attraction', 'sightseeing', 'landmark',
      'nhà hàng', 'restaurant', 'food', 'ăn uống', 'ẩm thực',
      'phương tiện', 'transport', 'di chuyển', 'get around',
      'thời tiết', 'weather', 'climate',
      'hoạt động', 'activity', 'entertainment',
      'địa điểm', 'location', 'place', 'spot',
      'gợi ý', 'suggest', 'recommend', 'đề xuất',
      'văn hóa', 'culture', 'lễ hội', 'festival',
      'check-in', 'check-out', 'đặt phòng', 'booking',
      'giá', 'price', 'cost', 'chi phí',
      'an toàn', 'safety', 'security',
      'tip', 'mẹo', 'advice', 'lời khuyên',
      'ngày', 'day', 'thời gian', 'time',
      'gần đây', 'nearby', 'gần', 'near',
      'đến', 'đi', 'go', 'come', 'visit'
    ];

    const messageLower = message.toLowerCase();
    
    // Kiểm tra xem có từ khóa du lịch không
    const hasTravelKeyword = travelKeywords.some(keyword => messageLower.includes(keyword));
    
    // Kiểm tra các từ khóa cấm (không liên quan đến du lịch)
    const nonTravelKeywords = [
      'code', 'programming', 'lập trình', 'code', 'debug',
      'chính trị', 'politics', 'political',
      'y tế', 'medical', 'bệnh', 'disease', 'illness',
      'đầu tư', 'investment', 'stock', 'chứng khoán',
      'giải toán', 'solve math', 'tính toán', 'calculate',
      'học', 'learn', 'study', 'education', 'giáo dục'
    ];
    
    const hasNonTravelKeyword = nonTravelKeywords.some(keyword => messageLower.includes(keyword));
    
    // Nếu có từ khóa cấm, không phải du lịch
    if (hasNonTravelKeyword) {
      return false;
    }
    
    // Nếu có từ khóa du lịch hoặc câu hỏi ngắn/đơn giản, cho phép
    if (hasTravelKeyword || message.trim().length < 50) {
      return true;
    }
    
    // Mặc định cho phép nếu không chắc chắn
    return true;
  }

  async chat(
    messages: AIMessage[], 
    model: string = 'amazon/nova-2-lite-v1:free', 
    enableReasoning: boolean = true,
    options?: {
      homestayName?: string;
      homestayAddress?: string;
      homestayId?: string;
      bookingId?: string;
      includeReviews?: boolean;
      includeCoupons?: boolean;
    }
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key chưa được cấu hình. Vui lòng thêm EXPO_PUBLIC_OPENROUTER_API_KEY vào .env');
    }

    // Kiểm tra message cuối cùng có phải là user message không và có liên quan đến du lịch không
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (lastUserMessage && !this.isTravelRelated(lastUserMessage.content)) {
      return {
        content: 'Xin lỗi, tôi chỉ có thể hỗ trợ bạn về các vấn đề liên quan đến du lịch, homestay và lịch trình chuyến đi. Bạn có câu hỏi nào về du lịch không?',
        reasoning_details: undefined,
      };
    }

    // Fetch database context nếu có homestayId hoặc bookingId
    let databaseContext: string | undefined;
    if (options?.homestayId || options?.bookingId) {
      try {
        databaseContext = await this.buildDatabaseContext({
          homestayId: options.homestayId,
          bookingId: options.bookingId,
          includeReviews: options.includeReviews !== false,
          includeCoupons: options.includeCoupons,
        });
      } catch (error) {
        console.error('Error building database context:', error);
        // Tiếp tục mà không có context nếu có lỗi
      }
    }

    // Tạo system message nếu chưa có
    let finalMessages: AIMessage[] = [...messages];
    const hasSystemMessage = messages.some(msg => msg.role === 'system');
    
    if (!hasSystemMessage && (options?.homestayName || options?.homestayId || options?.bookingId)) {
      // Thêm system prompt vào đầu conversation với database context
      finalMessages = [
        {
          role: 'system',
          content: this.getSystemPrompt(
            options.homestayName,
            options.homestayAddress,
            databaseContext
          ),
        },
        ...messages,
      ];
    } else if (hasSystemMessage && databaseContext) {
      // Nếu đã có system message, cập nhật nó với database context
      const systemMessageIndex = finalMessages.findIndex(msg => msg.role === 'system');
      if (systemMessageIndex !== -1) {
        finalMessages[systemMessageIndex] = {
          ...finalMessages[systemMessageIndex],
          content: this.getSystemPrompt(
            options?.homestayName,
            options?.homestayAddress,
            databaseContext
          ),
        };
      }
    }

    // Danh sách model fallback nếu model chính không hoạt động
    const fallbackModels = [
      model,
      'amazon/nova-2-lite-v1:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'google/gemini-flash-1.5:free',
      'microsoft/phi-3-mini-128k-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
    ].filter((m, index, arr) => arr.indexOf(m) === index); // Loại bỏ duplicate

    let lastError: Error | null = null;

    // Thử từng model cho đến khi thành công
    for (const currentModel of fallbackModels) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081',
          'X-Title': 'Smart Homestay System',
        },
        body: JSON.stringify({
            model: currentModel,
          messages: finalMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
              // Preserve reasoning_details từ assistant messages (quan trọng cho reasoning continuation)
            ...(msg.reasoning_details && { reasoning_details: msg.reasoning_details }),
          })),
            // Enable reasoning cho các model hỗ trợ (Amazon Nova, Grok)
            ...(enableReasoning && (currentModel.includes('nova') || currentModel.includes('grok')) && { 
              reasoning: { enabled: true } 
            }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || `API error: ${response.status} ${response.statusText}`;
          
          // Nếu lỗi là "No endpoints found", thử model tiếp theo
          if (errorMessage.includes('No endpoints found') || errorMessage.includes('not found')) {
            console.warn(`Model ${currentModel} không khả dụng, thử model tiếp theo...`);
            lastError = new Error(errorMessage);
            continue;
          }
          
          throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        throw new Error('Invalid response format from AI service');
      }

      const assistantMessage = result.choices[0].message;

        // Nếu đã fallback sang model khác, log để thông báo
        if (currentModel !== model) {
          console.info(`Đã sử dụng model fallback: ${currentModel} thay vì ${model}`);
        }

      return {
        content: assistantMessage.content || '',
        reasoning_details: assistantMessage.reasoning_details,
      };
    } catch (error: any) {
        // Nếu lỗi là "No endpoints found", tiếp tục thử model tiếp theo
        if (error.message?.includes('No endpoints found') || error.message?.includes('not found')) {
          console.warn(`Model ${currentModel} không khả dụng:`, error.message);
          lastError = error;
          continue;
        }
        
        // Nếu là lỗi khác (network, auth, etc.), throw ngay
      console.error('AI Service Error:', error);
      throw new Error(error.message || 'Có lỗi xảy ra khi gọi AI service');
    }
    }

    // Nếu tất cả model đều thất bại
    console.error('Tất cả các model đều không khả dụng');
    throw new Error(
      lastError?.message || 
      'Không tìm thấy model AI khả dụng. Vui lòng kiểm tra lại cấu hình hoặc thử lại sau.'
    );
  }

  // Helper để tạo prompt gợi ý lịch trình với dữ liệu từ database
  async createItineraryPrompt(
    homestayId: string,
    checkIn: string,
    checkOut: string,
    numberOfDays: number,
    preferences?: string,
    bookingId?: string
  ): Promise<string> {
    // Fetch dữ liệu từ database
    const homestay = await this.fetchHomestayData(homestayId);
    const reviews = await this.fetchHomestayReviews(homestayId, 5);
    
    let booking: BookingContext | null = null;
    if (bookingId) {
      booking = await this.fetchBookingData(bookingId);
    }

    const homestayName = homestay?.name || 'N/A';
    const homestayAddress = homestay?.address
      ? `${homestay.address.street}, ${homestay.address.ward.name}, ${homestay.address.district.name}, ${homestay.address.province.name}`
      : 'N/A';

    let basePrompt = `Bạn là một trợ lý du lịch thông minh chuyên gợi ý lịch trình cho khách du lịch. 
Hãy tạo lịch trình chi tiết cho chuyến đi của tôi:

📍 **Thông tin homestay:**
- Tên: ${homestayName}
- Địa chỉ: ${homestayAddress}`;

    if (homestay?.description) {
      basePrompt += `\n- Mô tả: ${homestay.description}`;
    }

    if (homestay?.amenities && homestay.amenities.length > 0) {
      basePrompt += `\n- Tiện ích: ${homestay.amenities.join(', ')}`;
    }

    if (homestay?.averageRating) {
      basePrompt += `\n- Đánh giá: ${homestay.averageRating}/5 (${homestay.reviewCount || 0} đánh giá)`;
    }

    basePrompt += `\n\n📅 **Thông tin chuyến đi:**
- Ngày nhận phòng: ${checkIn}
- Ngày trả phòng: ${checkOut}
- Số ngày: ${numberOfDays} ngày ${numberOfDays > 1 ? 'đêm' : ''}`;

    if (booking) {
      basePrompt += `\n- Số khách: ${booking.numberOfGuests} người`;
      if (booking.guestInfo?.specialRequests) {
        basePrompt += `\n- Yêu cầu đặc biệt: ${booking.guestInfo.specialRequests}`;
      }
    }

    if (reviews.length > 0) {
      basePrompt += `\n\n📝 **Đánh giá từ khách hàng trước:**`;
      reviews.slice(0, 3).forEach((review, index) => {
        basePrompt += `\n${index + 1}. ⭐ ${review.rating}/5`;
        if (review.comment) {
          basePrompt += ` - "${review.comment.substring(0, 100)}${review.comment.length > 100 ? '...' : ''}"`;
        }
      });
    }

    if (preferences) {
      basePrompt += `\n\n💭 **Sở thích và yêu cầu của tôi:**\n${preferences}\n`;
    }

    basePrompt += `\n\nHãy tạo lịch trình chi tiết bao gồm:
1. Các điểm tham quan nổi tiếng gần homestay
2. Nhà hàng/quán ăn ngon trong khu vực
3. Hoạt động vui chơi giải trí phù hợp
4. Phương tiện di chuyển và lộ trình tối ưu
5. Lưu ý và mẹo du lịch

Lịch trình nên được chia theo ngày một cách chi tiết và dễ thực hiện.`;

    return basePrompt;
  }
}

export const aiService = new AIService();

// Khởi tạo API key từ environment variable
// Expo tự động load EXPO_PUBLIC_* vars từ .env và expose qua process.env
const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
if (apiKey) {
  aiService.setApiKey(apiKey);
} else {
  console.warn('EXPO_PUBLIC_OPENROUTER_API_KEY chưa được cấu hình. Vui lòng thêm vào file .env');
}

