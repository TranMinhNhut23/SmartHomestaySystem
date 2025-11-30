// Service tạo và verify captcha đơn giản (math captcha)
class CaptchaService {
  constructor() {
    // Store captcha sessions in memory (có thể migrate sang Redis sau)
    // Format: { sessionId: { answer, expiresAt } }
    this.captchaStore = new Map();
    
    // Captcha expiration: 5 phút
    this.CAPTCHA_EXPIRY = 5 * 60 * 1000; // 5 minutes
    
    // Cleanup expired captchas mỗi 5 phút
    this.startCleanupInterval();
  }

  // Generate random session ID
  generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Tạo captcha mới (alphanumeric - chữ và số)
  generateCaptcha() {
    // Ký tự dùng cho captcha (loại bỏ các ký tự dễ nhầm lẫn)
    // Không dùng: 0 (số không), O (chữ O), 1 (số một), I (chữ i), l (chữ L thường)
    // Dùng: 2-9, A-H, J-N, P-Z, a-k, m-z
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    const length = 5; // Độ dài captcha: 5 ký tự
    
    let captchaText = '';
    for (let i = 0; i < length; i++) {
      captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const sessionId = this.generateSessionId();
    const expiresAt = Date.now() + this.CAPTCHA_EXPIRY;

    // Lưu captcha (case-insensitive để user có thể nhập hoa/thường)
    this.captchaStore.set(sessionId, {
      answer: captchaText.toLowerCase(), // Lưu dạng lowercase để so sánh
      expiresAt
    });

    console.log(`Captcha generated: ${captchaText} (session: ${sessionId})`);

    return {
      sessionId,
      question: captchaText, // Trả về dạng hiển thị (có thể mix hoa/thường)
      expiresAt
    };
  }

  // Verify captcha
  verifyCaptcha(sessionId, userAnswer) {
    const captchaData = this.captchaStore.get(sessionId);

    if (!captchaData) {
      throw new Error('Mã captcha không tồn tại hoặc đã hết hạn');
    }

    // Kiểm tra hết hạn
    if (Date.now() > captchaData.expiresAt) {
      this.captchaStore.delete(sessionId);
      throw new Error('Mã captcha đã hết hạn. Vui lòng thử lại');
    }

    // Normalize user answer (trim và chuyển về lowercase)
    const normalizedAnswer = String(userAnswer || '').trim().toLowerCase();

    if (!normalizedAnswer) {
      throw new Error('Vui lòng nhập mã captcha');
    }

    // Verify answer (case-insensitive)
    if (normalizedAnswer !== captchaData.answer) {
      throw new Error('Mã captcha không đúng');
    }

    // Xóa captcha sau khi verify thành công
    this.captchaStore.delete(sessionId);

    console.log(`Captcha verified successfully for session: ${sessionId}`);
    return true;
  }

  // Cleanup expired captchas
  cleanupExpiredCaptchas() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, captchaData] of this.captchaStore.entries()) {
      if (now > captchaData.expiresAt) {
        this.captchaStore.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired captcha(s)`);
    }
  }

  // Start cleanup interval
  startCleanupInterval() {
    // Cleanup mỗi 5 phút
    setInterval(() => {
      this.cleanupExpiredCaptchas();
    }, 5 * 60 * 1000);
  }
}

module.exports = new CaptchaService();

