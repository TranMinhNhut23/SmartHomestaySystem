const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const jwtConfig = require('../config/jwt');
const uploadService = require('./uploadService');

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

  // Đăng ký người dùng mới
  async registerUser(userData) {
    try {
      const { username, email, password, avatar, roleName } = userData;

      console.log('Registering user:', { username, email, roleName, hasAvatar: !!avatar });

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error('Email đã được sử dụng');
        }
        if (existingUser.username === username) {
          throw new Error('Username đã được sử dụng');
        }
      }

      // Tìm role từ database (mặc định là 'user')
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

      // Xử lý avatar: nếu là base64, lưu vào file và lấy filename
      let avatarFilename = null;
      if (avatar && avatar.startsWith('data:image')) {
        // Tạm thời dùng email để tạo filename (sẽ được thay bằng userId sau khi save)
        avatarFilename = await uploadService.saveBase64Image(avatar, email);
      } else if (avatar) {
        // Nếu là URL, giữ nguyên
        avatarFilename = avatar;
      }

      // Tạo user mới
      const user = new User({
        username,
        email,
        password,
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
      console.error('Error in registerUser:', error);
      throw error;
    }
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
}

module.exports = new AuthService();

