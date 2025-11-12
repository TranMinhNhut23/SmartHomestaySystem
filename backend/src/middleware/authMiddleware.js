const authService = require('../services/authService');
const User = require('../models/User');

// Middleware để xác thực JWT token
const authenticate = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token, vui lòng đăng nhập'
      });
    }

    const token = authHeader.substring(7); // Bỏ "Bearer " prefix

    // Verify token
    const decoded = authService.verifyToken(token);

    // Tìm user và populate role
    const user = await User.findById(decoded.userId).populate('role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    // Gán user vào request
    const userObj = user.toJSON();
    // Nếu có role object, lấy tên role
    if (userObj.role && typeof userObj.role === 'object') {
      userObj.roleName = userObj.role.name || userObj.roleName || 'user';
    } else {
      userObj.roleName = userObj.roleName || 'user';
    }
    req.user = userObj;
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message || 'Token không hợp lệ'
    });
  }
};

// Middleware để kiểm tra role
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập'
      });
    }

    // Lấy role name từ user
    let userRoleName = req.user.roleName;
    
    // Nếu user có role object, lấy name từ đó
    if (req.user.role && typeof req.user.role === 'object') {
      userRoleName = req.user.role.name || userRoleName;
    }

    // Kiểm tra role
    if (!roles.includes(userRoleName)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập'
      });
    }

    next();
  };
};

// Middleware để kiểm tra permission cụ thể
const checkPermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập'
      });
    }

    // Lấy role object từ user
    let role = req.user.role;
    
    // Nếu role là string (ObjectId), cần populate
    if (typeof role === 'string' || !role) {
      const User = require('../models/User');
      const user = await User.findById(req.userId).populate('role');
      role = user.role;
    }

    // Kiểm tra permission
    if (!role || !role.permissions || !role.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền: ${permission}`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  checkPermission
};

