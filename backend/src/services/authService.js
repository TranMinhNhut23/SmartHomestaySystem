const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Role = require('../models/Role');
const jwtConfig = require('../config/jwt');
const uploadService = require('./uploadService');
const walletService = require('./walletService');
const otpService = require('./otpService');
const emailService = require('./emailService');
const captchaService = require('./captchaService');

class AuthService {
  // Tạo JWT token
  generateToken(userId) {
    return jwt.sign(
      { userId },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  // Tạo refresh token
  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );
  }

  // Verify token
  verifyToken(token) {
    try {
      return jwt.verify(token, jwtConfig.secret);
    } catch (error) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // Gửi mã OTP để xác thực email khi đăng ký
  async sendRegistrationOTP(userData) {
    try {
      const { username, email, password, phone, avatar, roleName } = userData;

      console.log('Sending registration OTP:', { username, email, phone, roleName });

      // Validation cơ bản
      if (!username || !email || !password) {
        throw new Error('Vui lòng điền đầy đủ thông tin: username, email, password');
      }

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }]
      });

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          throw new Error('Email đã được sử dụng');
        }
        if (existingUser.username === username) {
          throw new Error('Username đã được sử dụng');
        }
      }

      // Validate phone nếu có
      if (phone && !/^[0-9]{10,11}$/.test(phone)) {
        throw new Error('Số điện thoại không hợp lệ (10-11 chữ số)');
      }

      // Tạo OTP và lưu userData tạm thời
      const otpCode = otpService.createOTP(email, {
        username,
        email: email.toLowerCase(),
        password,
        phone: phone || null,
        avatar: avatar || null,
        roleName: roleName || 'user'
      });

      // Gửi email OTP
      const emailResult = await emailService.sendOTPEmail(email, otpCode, username);

      if (!emailResult.success) {
        // Nếu không gửi được email, xóa OTP và throw error
        otpService.deleteOTP(email);
        throw new Error(emailResult.message || 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
      }

      console.log(`OTP sent to ${email} successfully`);

      return {
        success: true,
        message: 'Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
        email: email.toLowerCase() // Trả về email để frontend có thể dùng để verify
      };
    } catch (error) {
      console.error('Error in sendRegistrationOTP:', error);
      throw error;
    }
  }

  // Xác thực OTP và hoàn tất đăng ký
  async verifyOTPAndRegister(email, otpCode) {
    try {
      console.log('Verifying OTP for:', email);

      // Verify OTP và lấy userData
      const userData = otpService.verifyOTP(email, otpCode);

      const { username, email: userEmail, password, phone, avatar, roleName } = userData;

      // Tìm role từ database
      const roleNameToUse = roleName || 'user';
      let role = await Role.findOne({ name: roleNameToUse.toLowerCase() });
      
      // Nếu role chưa tồn tại, thử khởi tạo roles mặc định
      if (!role) {
        console.log(`Role '${roleNameToUse}' chưa tồn tại, đang khởi tạo roles mặc định...`);
        const { initializeRoles } = require('../config/roles');
        await initializeRoles();
        
        // Thử tìm lại role
        role = await Role.findOne({ name: roleNameToUse.toLowerCase() });
        
        if (!role) {
          throw new Error(`Role '${roleNameToUse}' không tồn tại. Vui lòng liên hệ quản trị viên.`);
        }
      }

      // Kiểm tra lại email/username (phòng trường hợp đã được đăng ký trong lúc chờ OTP)
      const existingUser = await User.findOne({
        $or: [{ email: userEmail }, { username }]
      });

      if (existingUser) {
        if (existingUser.email === userEmail) {
          throw new Error('Email đã được sử dụng');
        }
        if (existingUser.username === username) {
          throw new Error('Username đã được sử dụng');
        }
      }

      // Xử lý avatar: nếu là base64, lưu vào file và lấy filename
      let avatarFilename = null;
      if (avatar && avatar.startsWith('data:image')) {
        avatarFilename = await uploadService.saveBase64Image(avatar, userEmail);
      } else if (avatar) {
        avatarFilename = avatar;
      }

      // Tạo user mới
      const user = new User({
        username,
        email: userEmail,
        password,
        phone: phone || null,
        avatar: avatarFilename ? uploadService.getImageUrl(avatarFilename) : null,
        role: role._id,
        roleName: roleNameToUse
      });

      try {
        await user.save();
      } catch (error) {
        // Xử lý lỗi validation từ Mongoose
        if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors).map(err => err.message);
          throw new Error(messages.join(', '));
        }
        if (error.code === 11000) {
          // Duplicate key error
          const field = Object.keys(error.keyPattern)[0];
          throw new Error(`${field} đã được sử dụng`);
        }
        throw error;
      }

      // Tạo ví cho user
      try {
        const wallet = await walletService.createWallet(user._id);
        console.log('Wallet created for user:', user._id, 'Wallet ID:', wallet._id);
      } catch (walletError) {
        console.error('Error creating wallet for user:', walletError);
        // Không throw error để không ảnh hưởng đến việc đăng ký
      }

      // Tạo token
      const token = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      console.log('User registered successfully:', user._id);

      return {
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Error in verifyOTPAndRegister:', error);
      throw error;
    }
  }

  // Resend OTP
  async resendRegistrationOTP(email) {
    try {
      // Lấy userData từ OTP store
      const userData = otpService.getOTPData(email);

      if (!userData) {
        throw new Error('Không tìm thấy yêu cầu xác thực. Vui lòng đăng ký lại.');
      }

      // Tạo OTP mới
      const otpCode = otpService.resendOTP(email);

      // Gửi email OTP
      const emailResult = await emailService.sendOTPEmail(email, otpCode, userData.username);

      if (!emailResult.success) {
        throw new Error(emailResult.message || 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
      }

      return {
        success: true,
        message: 'Mã xác thực mới đã được gửi đến email của bạn.'
      };
    } catch (error) {
      console.error('Error in resendRegistrationOTP:', error);
      throw error;
    }
  }

  // Đăng ký người dùng mới (giữ lại để backward compatibility, nhưng sẽ redirect sang OTP flow)
  async registerUser(userData) {
    // Redirect sang sendOTP flow
    return await this.sendRegistrationOTP(userData);
  }

  // Đăng nhập
  async loginUser(email, password) {
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Email hoặc password không đúng');
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      throw new Error('Email hoặc password không đúng');
    }

    const token = this.generateToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    return {
      user: user.toJSON(),
      token,
      refreshToken
    };
  }

  // Xác thực Google ID token và đăng nhập/đăng ký
  async loginWithGoogle(idToken) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        throw new Error('Thiếu cấu hình GOOGLE_CLIENT_ID trong file .env');
      }

      const client = new OAuth2Client(clientId);

      // Verify ID token
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: clientId
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, name, picture } = payload;

      if (!email) {
        throw new Error('Không thể lấy email từ Google account');
      }

      // Tìm user theo googleId hoặc email
      let user = await User.findOne({
        $or: [
          { googleId: googleId },
          { email: email.toLowerCase() }
        ]
      }).populate('role');

      if (user) {
        // User đã tồn tại - cập nhật googleId nếu chưa có
        if (!user.googleId) {
          user.googleId = googleId;
          if (picture && !user.avatar) {
            user.avatar = picture;
          }
          await user.save();
        }
      } else {
        // Tạo user mới
        let role = await Role.findOne({ name: 'user' });
        if (!role) {
          const { initializeRoles } = require('../config/roles');
          await initializeRoles();
          role = await Role.findOne({ name: 'user' });
          if (!role) {
            throw new Error('Không thể tạo role user. Vui lòng liên hệ quản trị viên.');
          }
        }

        // Tạo username từ email (lấy phần trước @)
        const usernameBase = email.split('@')[0];
        let username = usernameBase;
        let counter = 1;
        
        // Đảm bảo username unique
        while (await User.findOne({ username })) {
          username = `${usernameBase}${counter}`;
          counter++;
        }

        user = new User({
          username,
          email: email.toLowerCase(),
          googleId: googleId,
          avatar: picture || null,
          role: role._id,
          roleName: 'user',
          password: null // Không cần password khi đăng nhập bằng Google
        });

        await user.save();
        user = await User.findById(user._id).populate('role');

        // Tạo ví cho user mới
        try {
          const wallet = await walletService.createWallet(user._id);
          console.log('Wallet created for Google user:', user._id, 'Wallet ID:', wallet._id);
        } catch (walletError) {
          console.error('Error creating wallet for Google user:', walletError);
          // Không throw error để không ảnh hưởng đến việc đăng nhập
        }
      }

      // Tạo token
      const token = this.generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      console.log('Google login successful:', user._id);

      return {
        user: user.toJSON(),
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Đăng nhập bằng Google thất bại');
    }
  }

  // Yêu cầu reset password (gửi OTP)
  async requestPasswordReset(identifier, captchaSessionId, captchaAnswer) {
    try {
      // Verify captcha trước
      captchaService.verifyCaptcha(captchaSessionId, captchaAnswer);

      // Tìm user theo email hoặc username
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });

      if (!user) {
        // Không tiết lộ user có tồn tại hay không (security best practice)
        throw new Error('Nếu email/username tồn tại, mã xác thực đã được gửi đến email của bạn.');
      }

      // Kiểm tra user có email không (cần email để gửi OTP)
      if (!user.email) {
        throw new Error('Tài khoản không có email. Vui lòng liên hệ quản trị viên.');
      }

      // Tạo OTP cho reset password
      const otpCode = otpService.createPasswordResetOTP(user.email, user._id);

      // Gửi email OTP
      const emailResult = await emailService.sendPasswordResetOTP(
        user.email,
        otpCode,
        user.username
      );

      if (!emailResult.success) {
        otpService.deletePasswordResetOTP(user.email);
        throw new Error(emailResult.message || 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
      }

      console.log(`Password reset OTP sent to ${user.email}`);

      return {
        success: true,
        message: 'Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
        email: user.email.toLowerCase() // Trả về email để frontend có thể dùng để verify
      };
    } catch (error) {
      console.error('Error in requestPasswordReset:', error);
      throw error;
    }
  }

  // Verify OTP cho reset password
  async verifyPasswordResetOTP(email, otpCode) {
    try {
      const userId = otpService.verifyPasswordResetOTP(email.toLowerCase(), otpCode);

      if (!userId) {
        throw new Error('Mã xác thực không hợp lệ');
      }

      return {
        success: true,
        message: 'Mã xác thực hợp lệ. Vui lòng nhập mật khẩu mới.',
        userId
      };
    } catch (error) {
      console.error('Error in verifyPasswordResetOTP:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(email, otpCode, newPassword) {
    try {
      // Verify OTP trước
      const userId = otpService.verifyPasswordResetOTP(email.toLowerCase(), otpCode);

      if (!userId) {
        throw new Error('Mã xác thực không hợp lệ');
      }

      // Validate password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
      }

      // Tìm user
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }

      // Kiểm tra email khớp
      if (user.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error('Email không khớp với tài khoản');
      }

      // Cập nhật password (Mongoose sẽ tự động hash)
      user.password = newPassword;
      await user.save();

      // Xóa OTP sau khi reset thành công
      otpService.deletePasswordResetOTP(email.toLowerCase());

      console.log(`Password reset successfully for user: ${user._id}`);

      return {
        success: true,
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới.'
      };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }

  // Resend password reset OTP
  async resendPasswordResetOTP(identifier) {
    try {
      // Tìm user
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });

      if (!user || !user.email) {
        throw new Error('Không tìm thấy tài khoản hoặc tài khoản không có email');
      }

      // Tạo OTP mới
      const otpCode = otpService.resendPasswordResetOTP(user.email, user._id);

      // Gửi email OTP
      const emailResult = await emailService.sendPasswordResetOTP(
        user.email,
        otpCode,
        user.username
      );

      if (!emailResult.success) {
        throw new Error(emailResult.message || 'Không thể gửi email xác thực. Vui lòng thử lại sau.');
      }

      return {
        success: true,
        message: 'Mã xác thực mới đã được gửi đến email của bạn.'
      };
    } catch (error) {
      console.error('Error in resendPasswordResetOTP:', error);
      throw error;
    }
  }

  // Gửi OTP để thay đổi email
  async sendEmailChangeOTP(userId, newEmail) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }

      const trimmedEmail = newEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Email không hợp lệ');
      }

      // Kiểm tra email mới có khác email hiện tại không
      if (trimmedEmail === user.email.toLowerCase()) {
        throw new Error('Email mới phải khác email hiện tại');
      }

      // Kiểm tra email đã tồn tại chưa
      const existingUser = await User.findOne({ 
        email: trimmedEmail,
        _id: { $ne: userId }
      });
      if (existingUser) {
        throw new Error('Email đã được sử dụng');
      }

      // Tạo OTP
      const otpService = require('./otpService');
      const emailService = require('./emailService');
      const otpCode = otpService.createEmailChangeOTP(userId, trimmedEmail);

      // Gửi email OTP
      const emailResult = await emailService.sendEmailChangeOTP(
        user.email,
        otpCode,
        user.username,
        trimmedEmail
      );

      if (!emailResult.success) {
        // Xóa OTP nếu gửi email thất bại
        otpService.deleteEmailChangeOTP(trimmedEmail);
        throw new Error(emailResult.message || 'Không thể gửi email xác thực');
      }

      return {
        success: true,
        message: 'Mã xác thực đã được gửi đến email mới của bạn',
        email: trimmedEmail
      };
    } catch (error) {
      console.error('Error in sendEmailChangeOTP:', error);
      throw error;
    }
  }

  // Xác thực OTP cho email change
  async verifyEmailChangeOTP(newEmail, otpCode) {
    try {
      const otpService = require('./otpService');
      const result = otpService.verifyEmailChangeOTP(newEmail.toLowerCase(), otpCode);

      return {
        success: true,
        message: 'Xác thực email thành công',
        userId: result.userId,
        newEmail: result.newEmail
      };
    } catch (error) {
      console.error('Error in verifyEmailChangeOTP:', error);
      throw error;
    }
  }

  // Gửi lại OTP cho email change
  async resendEmailChangeOTP(userId, newEmail) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }

      const trimmedEmail = newEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Email không hợp lệ');
      }

      // Kiểm tra email mới có khác email hiện tại không
      if (trimmedEmail === user.email.toLowerCase()) {
        throw new Error('Email mới phải khác email hiện tại');
      }

      // Kiểm tra email đã tồn tại chưa
      const existingUser = await User.findOne({ 
        email: trimmedEmail,
        _id: { $ne: userId }
      });
      if (existingUser) {
        throw new Error('Email đã được sử dụng');
      }

      // Tạo OTP mới
      const otpService = require('./otpService');
      const emailService = require('./emailService');
      const otpCode = otpService.resendEmailChangeOTP(userId, trimmedEmail);

      // Gửi email OTP
      const emailResult = await emailService.sendEmailChangeOTP(
        user.email,
        otpCode,
        user.username,
        trimmedEmail
      );

      if (!emailResult.success) {
        throw new Error(emailResult.message || 'Không thể gửi email xác thực');
      }

      return {
        success: true,
        message: 'Mã xác thực đã được gửi lại đến email mới của bạn',
        email: trimmedEmail
      };
    } catch (error) {
      console.error('Error in resendEmailChangeOTP:', error);
      throw error;
    }
  }

  // Cập nhật thông tin user
  async updateProfile(userId, updateData, updaterId, updaterRole) {
    try {
      // Tìm user cần cập nhật
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Người dùng không tồn tại');
      }

      // Kiểm tra quyền: user chỉ có thể update chính mình, admin có thể update bất kỳ ai
      if (updaterRole !== 'admin' && userId.toString() !== updaterId.toString()) {
        throw new Error('Bạn không có quyền cập nhật thông tin người dùng này');
      }

      const { username, email, phone, avatar } = updateData;

      // Validate username nếu có thay đổi
      if (username && username.trim() !== user.username) {
        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
          throw new Error('Username phải có ít nhất 3 ký tự');
        }
        if (trimmedUsername.length > 30) {
          throw new Error('Username không được vượt quá 30 ký tự');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
          throw new Error('Username chỉ được chứa chữ cái, số và dấu gạch dưới');
        }

        // Kiểm tra username đã tồn tại chưa
        const existingUser = await User.findOne({ 
          username: trimmedUsername,
          _id: { $ne: userId }
        });
        if (existingUser) {
          throw new Error('Username đã được sử dụng');
        }

        user.username = trimmedUsername;
      }

      // Validate email nếu có thay đổi
      if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const trimmedEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          throw new Error('Email không hợp lệ');
        }

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await User.findOne({ 
          email: trimmedEmail,
          _id: { $ne: userId }
        });
        if (existingUser) {
          throw new Error('Email đã được sử dụng');
        }

        // Kiểm tra OTP verification cho email change
        const { emailChangeOTPVerified } = updateData;
        if (!emailChangeOTPVerified) {
          throw new Error('Email đã thay đổi. Vui lòng xác thực email mới bằng mã OTP trước khi lưu.');
        }

        // Verify OTP một lần nữa để đảm bảo
        const otpService = require('./otpService');
        const otpData = otpService.getEmailChangeData(trimmedEmail);
        if (!otpData || otpData.userId !== userId.toString() || otpData.newEmail !== trimmedEmail) {
          throw new Error('Email chưa được xác thực. Vui lòng xác thực email mới bằng mã OTP.');
        }

        // Xóa OTP sau khi verify thành công
        otpService.deleteEmailChangeOTP(trimmedEmail);

        user.email = trimmedEmail;
      }

      // Validate phone nếu có
      if (phone !== undefined) {
        if (phone && phone.trim()) {
          const trimmedPhone = phone.trim();
          if (!/^[0-9]{10,11}$/.test(trimmedPhone)) {
            throw new Error('Số điện thoại không hợp lệ (10-11 chữ số)');
          }
          user.phone = trimmedPhone;
        } else {
          user.phone = null;
        }
      }

      // Xử lý avatar nếu có
      if (avatar !== undefined) {
        if (avatar && avatar.startsWith('data:image')) {
          // Xóa avatar cũ nếu có
          if (user.avatar) {
            try {
              uploadService.deleteImage(user.avatar);
            } catch (error) {
              console.error('Error deleting old avatar:', error);
            }
          }

          // Lưu avatar mới
          const avatarFilename = await uploadService.saveBase64Image(avatar, user.email || user._id.toString());
          user.avatar = uploadService.getImageUrl(avatarFilename);
        } else if (avatar === null || avatar === '') {
          // Xóa avatar
          if (user.avatar) {
            try {
              uploadService.deleteImage(user.avatar);
            } catch (error) {
              console.error('Error deleting avatar:', error);
            }
          }
          user.avatar = null;
        } else if (avatar && !avatar.startsWith('data:image')) {
          // Giữ nguyên avatar (URL hoặc filename)
          user.avatar = avatar;
        }
      }

      await user.save();
      await user.populate('role');

      console.log(`Profile updated for user: ${user._id} by: ${updaterId}`);

      return {
        success: true,
        message: 'Cập nhật thông tin thành công',
        user: user.toJSON()
      };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();

