const authService = require('../services/authService');

class AuthController {
  // Đăng ký người dùng
  async register(req, res) {
    try {
      const { username, email, password, avatar, roleName } = req.body;

      // Validation cơ bản
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin: username, email, password'
        });
      }

      // Validate avatar nếu có (base64 string)
      if (avatar && typeof avatar === 'string') {
        // Kiểm tra nếu là base64 image
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

      // Chỉ cho phép đăng ký với role 'user' hoặc 'host', không cho phép đăng ký admin
      const allowedRoles = ['user', 'host'];
      if (roleName && !allowedRoles.includes(roleName.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể đăng ký với role này. Chỉ có thể đăng ký với role: user hoặc host'
        });
      }

      const result = await authService.registerUser({
        username,
        email,
        password,
        avatar: avatar || null,
        roleName: roleName ? roleName.toLowerCase() : 'user'
      });

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: result
      });
    } catch (error) {
      console.error('Register error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      
      // Trả về status 400 cho lỗi validation, 500 cho lỗi server
      const statusCode = error.name === 'ValidationError' || error.code === 11000 ? 400 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Đăng ký thất bại',
        error: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
          stack: error.stack
        } : undefined
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
}

module.exports = new AuthController();

