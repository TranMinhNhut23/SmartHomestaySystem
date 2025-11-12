const Role = require('../models/Role');

// Danh sách role mặc định cho hệ thống quản lý homestay
const defaultRoles = [
  {
    name: 'user',
    description: 'Người dùng thông thường - có thể đặt phòng homestay',
    permissions: [
      // Quản lý thông tin cá nhân
      'read:own-profile',
      'update:own-profile',
      // Xem danh sách homestay
      'read:homestays',
      'read:homestay-detail',
      // Đặt phòng
      'create:booking',
      'read:own-bookings',
      'update:own-booking',
      'cancel:own-booking',
      // Đánh giá
      'create:review',
      'update:own-review',
      'delete:own-review',
      // Thanh toán
      'read:own-payments',
      'create:payment'
    ],
    isActive: true
  },
  {
    name: 'host',
    description: 'Chủ nhà - quản lý homestay và đặt phòng của khách',
    permissions: [
      // Quản lý thông tin cá nhân
      'read:own-profile',
      'update:own-profile',
      // Quản lý homestay của mình
      'create:own-homestay',
      'read:own-homestays',
      'read:homestay-detail',
      'update:own-homestay',
      'delete:own-homestay',
      // Quản lý phòng của homestay mình
      'create:own-room',
      'read:own-rooms',
      'update:own-room',
      'delete:own-room',
      // Quản lý booking của homestay mình
      'read:own-homestay-bookings',
      'update:own-homestay-booking',
      'cancel:own-homestay-booking',
      'confirm:own-homestay-booking',
      // Xem thống kê
      'read:own-homestay-statistics',
      'read:own-homestay-revenue',
      // Quản lý đánh giá
      'read:own-homestay-reviews',
      'reply:own-homestay-review'
    ],
    isActive: true
  },
  {
    name: 'admin',
    description: 'Quản trị viên hệ thống - toàn quyền quản lý',
    permissions: [
      // Quản lý người dùng
      'read:all-users',
      'create:user',
      'update:any-user',
      'delete:any-user',
      'manage:user-roles',
      // Quản lý homestay
      'read:all-homestays',
      'create:homestay',
      'update:any-homestay',
      'delete:any-homestay',
      'approve:homestay',
      'reject:homestay',
      // Quản lý phòng
      'read:all-rooms',
      'create:room',
      'update:any-room',
      'delete:any-room',
      // Quản lý booking
      'read:all-bookings',
      'create:booking',
      'update:any-booking',
      'delete:any-booking',
      'cancel:any-booking',
      // Quản lý thanh toán
      'read:all-payments',
      'update:any-payment',
      'refund:payment',
      // Quản lý đánh giá
      'read:all-reviews',
      'update:any-review',
      'delete:any-review',
      // Quản lý role và permissions
      'manage:roles',
      'manage:permissions',
      // Thống kê và báo cáo
      'read:all-statistics',
      'read:all-revenue',
      'export:reports',
      // Cấu hình hệ thống
      'manage:system-settings',
      'manage:categories',
      'manage:locations'
    ],
    isActive: true
  }
];

// Khởi tạo role mặc định
const initializeRoles = async () => {
  try {
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (!existingRole) {
        const role = new Role(roleData);
        await role.save();
        console.log(`Đã tạo role mặc định: ${roleData.name}`);
      } else {
        // Cập nhật permissions nếu role đã tồn tại nhưng permissions khác
        if (JSON.stringify(existingRole.permissions.sort()) !== JSON.stringify(roleData.permissions.sort())) {
          existingRole.permissions = roleData.permissions;
          existingRole.description = roleData.description;
          await existingRole.save();
          console.log(`Đã cập nhật role: ${roleData.name}`);
        }
      }
    }
    console.log('Khởi tạo roles mặc định hoàn tất');
  } catch (error) {
    console.error('Lỗi khi khởi tạo roles mặc định:', error.message);
  }
};

module.exports = {
  defaultRoles,
  initializeRoles
};

