const authService = require('../services/authService');
const captchaService = require('../services/captchaService');

class AuthController {
  // Gửi mã OTP để xác thực email khi đăng ký
  async sendOTP(req, res) {
    try {
      const { username, email, password, phone, avatar, roleName } = req.body;

      // Validation cơ bản - required fields
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin: username, email, password'
        });
      }

      // Validate username
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username phải có ít nhất 3 ký tự'
        });
      }
      if (trimmedUsername.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username không được vượt quá 30 ký tự'
        });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'
        });
      }

      // Validate email
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Email không hợp lệ'
        });
      }

      // Validate password
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
      }

      // Validate phone nếu có
      if (phone && phone.trim()) {
        const trimmedPhone = phone.trim();
        if (!/^[0-9]{10,11}$/.test(trimmedPhone)) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại không hợp lệ (10-11 chữ số)'
          });
        }
      }

      // Validate avatar nếu có (base64 string)
      if (avatar && typeof avatar === 'string') {
        if (avatar.startsWith('data:image')) {
          const sizeInMB = (avatar.length * 3) / 4 / 1024 / 1024;
          if (sizeInMB > 5) {
            return res.status(400).json({
              success: false,
              message: 'Ảnh đại diện quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB'
            });
          }
        }
      }

      // Chỉ cho phép đăng ký với role 'user' hoặc 'host'
      const allowedRoles = ['user', 'host'];
      if (roleName && !allowedRoles.includes(roleName.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể đăng ký với role này. Chỉ có thể đăng ký với role: user hoặc host'
        });
      }

      const result = await authService.sendRegistrationOTP({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        phone: phone && phone.trim() ? phone.trim() : null,
        avatar: avatar || null,
        roleName: roleName ? roleName.toLowerCase() : 'user'
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email: result.email
        }
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      
      const statusCode = error.name === 'ValidationError' || error.code === 11000 ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Không thể gửi mã xác thực',
        error: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
          stack: error.stack
        } : undefined
      });
    }
  }

  // Xác thực OTP và hoàn tất đăng ký
  async verifyOTP(req, res) {
    try {
      const { email, otpCode } = req.body;

      if (!email || !otpCode) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email và mã xác thực'
        });
      }

      const result = await authService.verifyOTPAndRegister(email.toLowerCase(), otpCode);

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: result
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      const statusCode = error.name === 'ValidationError' || error.code === 11000 ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Xác thực thất bại',
        error: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
          stack: error.stack
        } : undefined
      });
    }
  }

  // Gửi lại mã OTP
  async resendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email'
        });
      }

      const result = await authService.resendRegistrationOTP(email.toLowerCase());

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể gửi lại mã xác thực'
      });
    }
  }

  // Đăng ký người dùng (giữ lại để backward compatibility, redirect sang sendOTP)
  async register(req, res) {
    // Redirect sang sendOTP flow
    return await this.sendOTP(req, res);
  }

  // Tạo captcha mới
  async generateCaptcha(req, res) {
    try {
      const captcha = captchaService.generateCaptcha();
      
      res.status(200).json({
        success: true,
        data: {
          sessionId: captcha.sessionId,
          question: captcha.question
        }
      });
    } catch (error) {
      console.error('Generate captcha error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể tạo captcha'
      });
    }
  }

  // Yêu cầu reset password
  async requestPasswordReset(req, res) {
    try {
      const { identifier, captchaSessionId, captchaAnswer } = req.body;

      if (!identifier || !captchaSessionId || !captchaAnswer) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin: email/username, captcha'
        });
      }

      const result = await authService.requestPasswordReset(
        identifier.trim(),
        captchaSessionId,
        captchaAnswer
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email: result.email
        }
      });
    } catch (error) {
      console.error('Request password reset error:', error);
      
      const statusCode = error.message.includes('captcha') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Không thể gửi mã xác thực'
      });
    }
  }

  // Verify OTP cho reset password
  async verifyPasswordResetOTP(req, res) {
    try {
      const { email, otpCode } = req.body;

      if (!email || !otpCode) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email và mã xác thực'
        });
      }

      const result = await authService.verifyPasswordResetOTP(
        email.toLowerCase(),
        otpCode
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId
        }
      });
    } catch (error) {
      console.error('Verify password reset OTP error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Xác thực thất bại'
      });
    }
  }

  // Reset password
  async resetPassword(req, res) {
    try {
      const { email, otpCode, newPassword, confirmPassword } = req.body;

      if (!email || !otpCode || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu xác nhận không khớp'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
      }

      const result = await authService.resetPassword(
        email.toLowerCase(),
        otpCode,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Reset password error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Đặt lại mật khẩu thất bại'
      });
    }
  }

  // Gửi lại OTP reset password
  async resendPasswordResetOTP(req, res) {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email hoặc username'
        });
      }

      const result = await authService.resendPasswordResetOTP(identifier.trim());

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Resend password reset OTP error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Không thể gửi lại mã xác thực'
      });
    }
  }

  // Đăng nhập
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email và password'
        });
      }

      const result = await authService.loginUser(email, password);

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message || 'Đăng nhập thất bại'
      });
    }
  }

  // Lấy thông tin user hiện tại
  async getCurrentUser(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi server'
      });
    }
  }

  // Đăng nhập bằng Google
  async loginWithGoogle(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp Google ID token'
        });
      }

      const result = await authService.loginWithGoogle(idToken);

      res.status(200).json({
        success: true,
        message: 'Đăng nhập bằng Google thành công',
        data: result
      });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Đăng nhập bằng Google thất bại'
      });
    }
  }

  // Gửi OTP để thay đổi email
  async sendEmailChangeOTP(req, res) {
    try {
      const { newEmail } = req.body;
      const userId = req.userId;

      if (!newEmail) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email mới'
        });
      }

      const result = await authService.sendEmailChangeOTP(userId, newEmail);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email: result.email
        }
      });
    } catch (error) {
      console.error('Send email change OTP error:', error);
      
      const statusCode = error.message.includes('tồn tại') ? 404 :
                        error.message.includes('đã được sử dụng') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Không thể gửi mã xác thực'
      });
    }
  }

  // Xác thực OTP cho email change
  async verifyEmailChangeOTP(req, res) {
    try {
      const { newEmail, otpCode } = req.body;

      if (!newEmail || !otpCode) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email mới và mã xác thực'
        });
      }

      const result = await authService.verifyEmailChangeOTP(newEmail, otpCode);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          userId: result.userId,
          newEmail: result.newEmail
        }
      });
    } catch (error) {
      console.error('Verify email change OTP error:', error);
      
      res.status(400).json({
        success: false,
        message: error.message || 'Xác thực thất bại'
      });
    }
  }

  // Gửi lại OTP cho email change
  async resendEmailChangeOTP(req, res) {
    try {
      const { newEmail } = req.body;
      const userId = req.userId;

      if (!newEmail) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập email mới'
        });
      }

      const result = await authService.resendEmailChangeOTP(userId, newEmail);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email: result.email
        }
      });
    } catch (error) {
      console.error('Resend email change OTP error:', error);
      
      const statusCode = error.message.includes('tồn tại') ? 404 :
                        error.message.includes('đã được sử dụng') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Không thể gửi lại mã xác thực'
      });
    }
  }

  // Cập nhật thông tin user
  async updateProfile(req, res) {
    try {
      const { userId } = req.params; // userId của user cần update
      const { username, email, phone, avatar, emailChangeOTPVerified } = req.body;
      const updaterId = req.userId; // User đang thực hiện update
      const updaterRole = req.user.roleName || 'user';

      // Nếu không có userId trong params, update chính mình
      const targetUserId = userId || updaterId;

      const result = await authService.updateProfile(
        targetUserId,
        { username, email, phone, avatar, emailChangeOTPVerified },
        updaterId,
        updaterRole
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
      const statusCode = error.message.includes('quyền') ? 403 : 
                        error.message.includes('tồn tại') ? 404 :
                        error.message.includes('đã được sử dụng') ? 400 :
                        error.message.includes('xác thực') ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Cập nhật thông tin thất bại'
      });
    }
  }
}

module.exports = new AuthController();

