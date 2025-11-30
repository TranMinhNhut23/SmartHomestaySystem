// Service quản lý OTP (One-Time Password) cho email verification
class OTPService {
  constructor() {
    // Store OTPs in memory với expiration (có thể migrate sang Redis sau)
    // Format: { email: { code, expiresAt, userData } }
    this.otpStore = new Map();
    
    // OTP expiration time: 10 phút
    this.OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    // OTP length: 6 digits
    this.OTP_LENGTH = 6;
    
    // Cleanup expired OTPs mỗi 5 phút
    this.startCleanupInterval();
  }

  // Generate random 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Tạo và lưu OTP cho email
  createOTP(email, userData) {
    // Xóa OTP cũ nếu có
    this.otpStore.delete(email.toLowerCase());

    const code = this.generateOTP();
    const expiresAt = Date.now() + this.OTP_EXPIRY;

    this.otpStore.set(email.toLowerCase(), {
      code,
      expiresAt,
      userData: { ...userData }, // Clone userData để tránh reference issues
      attempts: 0,
      maxAttempts: 5
    });

    console.log(`OTP created for ${email}: ${code} (expires in ${this.OTP_EXPIRY / 1000}s)`);

    return code;
  }

  // Verify OTP
  verifyOTP(email, code) {
    const emailKey = email.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData) {
      throw new Error('Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra hết hạn
    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(emailKey);
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra số lần thử
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(emailKey);
      throw new Error('Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.');
    }

    // Tăng số lần thử
    otpData.attempts++;

    // Kiểm tra mã
    if (otpData.code !== code) {
      const remainingAttempts = otpData.maxAttempts - otpData.attempts;
      if (remainingAttempts > 0) {
        throw new Error(`Mã xác thực không đúng. Còn ${remainingAttempts} lần thử.`);
      } else {
        this.otpStore.delete(emailKey);
        throw new Error('Mã xác thực không đúng. Vui lòng yêu cầu mã mới.');
      }
    }

    // Xác thực thành công - xóa OTP và trả về userData
    const userData = otpData.userData;
    this.otpStore.delete(emailKey);
    
    console.log(`OTP verified successfully for ${email}`);
    return userData;
  }

  // Lấy userData từ OTP (không verify, chỉ để check)
  getOTPData(email) {
    const emailKey = email.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData) {
      return null;
    }

    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(emailKey);
      return null;
    }

    return otpData.userData;
  }

  // Xóa OTP (sau khi verify thành công hoặc khi cần)
  deleteOTP(email) {
    this.otpStore.delete(email.toLowerCase());
  }

  // Cleanup expired OTPs
  cleanupExpiredOTPs() {
    const now = Date.now();
    let cleaned = 0;

    for (const [email, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(email);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired OTP(s)`);
    }
  }

  // Start cleanup interval
  startCleanupInterval() {
    // Cleanup mỗi 5 phút
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 5 * 60 * 1000);
  }

  // Resend OTP (tạo mã mới)
  resendOTP(email) {
    const emailKey = email.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData) {
      throw new Error('Không tìm thấy yêu cầu xác thực. Vui lòng đăng ký lại.');
    }

    // Tạo mã mới với cùng userData
    return this.createOTP(email, otpData.userData);
  }

  // Tạo OTP cho reset password
  createPasswordResetOTP(email, userId) {
    // Xóa OTP cũ nếu có
    this.otpStore.delete(email.toLowerCase());

    const code = this.generateOTP();
    const expiresAt = Date.now() + this.OTP_EXPIRY;

    this.otpStore.set(email.toLowerCase(), {
      code,
      expiresAt,
      userId: userId.toString(),
      type: 'password_reset',
      attempts: 0,
      maxAttempts: 5
    });

    console.log(`Password reset OTP created for ${email}: ${code} (expires in ${this.OTP_EXPIRY / 1000}s)`);

    return code;
  }

  // Verify OTP cho reset password
  verifyPasswordResetOTP(email, code) {
    const emailKey = email.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData) {
      throw new Error('Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra type
    if (otpData.type !== 'password_reset') {
      throw new Error('Mã xác thực không hợp lệ cho chức năng này.');
    }

    // Kiểm tra hết hạn
    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(emailKey);
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra số lần thử
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(emailKey);
      throw new Error('Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.');
    }

    // Tăng số lần thử
    otpData.attempts++;

    // Kiểm tra mã
    if (otpData.code !== code) {
      const remainingAttempts = otpData.maxAttempts - otpData.attempts;
      if (remainingAttempts > 0) {
        throw new Error(`Mã xác thực không đúng. Còn ${remainingAttempts} lần thử.`);
      } else {
        this.otpStore.delete(emailKey);
        throw new Error('Mã xác thực không đúng. Vui lòng yêu cầu mã mới.');
      }
    }

    // Xác thực thành công - trả về userId nhưng không xóa OTP (để dùng cho reset password)
    console.log(`Password reset OTP verified successfully for ${email}`);
    return otpData.userId;
  }

  // Lấy userId từ password reset OTP (sau khi verify)
  getPasswordResetUserId(email) {
    const emailKey = email.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData || otpData.type !== 'password_reset') {
      return null;
    }

    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(emailKey);
      return null;
    }

    return otpData.userId;
  }

  // Xóa password reset OTP sau khi reset thành công
  deletePasswordResetOTP(email) {
    this.otpStore.delete(email.toLowerCase());
  }

  // Resend password reset OTP
  resendPasswordResetOTP(email, userId) {
    return this.createPasswordResetOTP(email, userId);
  }

  // Tạo OTP cho email change
  createEmailChangeOTP(userId, newEmail) {
    const emailKey = newEmail.toLowerCase();
    // Xóa OTP cũ nếu có
    this.otpStore.delete(emailKey);

    const code = this.generateOTP();
    const expiresAt = Date.now() + this.OTP_EXPIRY;

    this.otpStore.set(emailKey, {
      code,
      expiresAt,
      userId: userId.toString(),
      newEmail: newEmail.toLowerCase(),
      type: 'email_change',
      attempts: 0,
      maxAttempts: 5
    });

    console.log(`Email change OTP created for ${newEmail}: ${code} (expires in ${this.OTP_EXPIRY / 1000}s)`);

    return code;
  }

  // Verify OTP cho email change
  verifyEmailChangeOTP(newEmail, code) {
    const emailKey = newEmail.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData) {
      throw new Error('Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra type
    if (otpData.type !== 'email_change') {
      throw new Error('Mã xác thực không hợp lệ cho chức năng này.');
    }

    // Kiểm tra hết hạn
    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(emailKey);
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra số lần thử
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(emailKey);
      throw new Error('Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.');
    }

    // Tăng số lần thử
    otpData.attempts++;

    // Kiểm tra mã
    if (otpData.code !== code) {
      const remainingAttempts = otpData.maxAttempts - otpData.attempts;
      if (remainingAttempts > 0) {
        throw new Error(`Mã xác thực không đúng. Còn ${remainingAttempts} lần thử.`);
      } else {
        this.otpStore.delete(emailKey);
        throw new Error('Mã xác thực không đúng. Vui lòng yêu cầu mã mới.');
      }
    }

    // Xác thực thành công - trả về userId và newEmail nhưng không xóa OTP (để dùng cho update profile)
    console.log(`Email change OTP verified successfully for ${newEmail}`);
    return {
      userId: otpData.userId,
      newEmail: otpData.newEmail
    };
  }

  // Lấy thông tin email change OTP (sau khi verify)
  getEmailChangeData(newEmail) {
    const emailKey = newEmail.toLowerCase();
    const otpData = this.otpStore.get(emailKey);

    if (!otpData || otpData.type !== 'email_change') {
      return null;
    }

    if (Date.now() > otpData.expiresAt) {
      this.otpStore.delete(emailKey);
      return null;
    }

    return {
      userId: otpData.userId,
      newEmail: otpData.newEmail
    };
  }

  // Xóa email change OTP sau khi update thành công
  deleteEmailChangeOTP(newEmail) {
    this.otpStore.delete(newEmail.toLowerCase());
  }

  // Resend email change OTP
  resendEmailChangeOTP(userId, newEmail) {
    return this.createEmailChangeOTP(userId, newEmail);
  }
}

module.exports = new OTPService();

