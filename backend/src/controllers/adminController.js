const User = require('../models/User');
const Role = require('../models/Role');
const Booking = require('../models/Booking');
const Homestay = require('../models/Homestay');
const HostRequest = require('../models/HostRequest');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

class AdminController {
  // Lấy tất cả users với phân trang và filter
  async getAllUsers(req, res) {
    try {
      const {
        roleName,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};
      
      if (roleName) {
        query.roleName = roleName;
      }
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Count total
      const total = await User.countDocuments(query);

      // Get users
      const users = await User.find(query)
        .select('-password')
        .populate('role', 'name description')
        .populate('wallet', 'balance status')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Get stats by role
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$roleName',
            count: { $sum: 1 }
          }
        }
      ]);

      const roleStats = {
        user: 0,
        host: 0,
        admin: 0
      };

      stats.forEach(stat => {
        if (stat._id) {
          roleStats[stat._id] = stat.count;
        }
      });

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          },
          stats: roleStats
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách người dùng'
      });
    }
  }

  // Lấy thông tin user theo ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select('-password')
        .populate('role', 'name description permissions')
        .populate('wallet', 'balance status totalDeposited totalWithdrawn totalSpent');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user by id error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy thông tin người dùng'
      });
    }
  }

  // Cập nhật thông tin user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { username, email, phone, avatar, roleName } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Update fields
      if (username) user.username = username;
      if (email) user.email = email;
      if (phone !== undefined) user.phone = phone;
      if (avatar !== undefined) user.avatar = avatar;

      // Update role if provided
      if (roleName && ['user', 'host', 'admin'].includes(roleName)) {
        const role = await Role.findOne({ name: roleName });
        if (role) {
          user.role = role._id;
          user.roleName = roleName;
        }
      }

      await user.save();
      await user.populate('role', 'name description');
      await user.populate('wallet', 'balance status');

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin người dùng thành công',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật thông tin người dùng thất bại'
      });
    }
  }

  // Toggle user status (active/inactive)
  async toggleUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.userId;

      // Không cho toggle chính mình
      if (userId === adminId) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể thay đổi trạng thái của chính mình'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Không cho toggle admin khác
      if (user.roleName === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không thể thay đổi trạng thái tài khoản admin'
        });
      }

      // Toggle status
      user.isActive = !user.isActive;
      await user.save();
      await user.populate('role', 'name description');
      await user.populate('wallet', 'balance status');

      res.status(200).json({
        success: true,
        message: user.isActive ? 'Đã kích hoạt người dùng' : 'Đã vô hiệu hóa người dùng',
        data: user
      });
    } catch (error) {
      console.error('Toggle user status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Thay đổi trạng thái người dùng thất bại'
      });
    }
  }

  // Xóa user (soft delete - set inactive)
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.userId;

      // Không cho xóa chính mình
      if (userId === adminId) {
        return res.status(400).json({
          success: false,
          message: 'Bạn không thể xóa chính mình'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Không cho xóa admin khác
      if (user.roleName === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Không thể xóa tài khoản admin'
        });
      }

      // Xóa user (có thể thêm soft delete sau)
      await User.findByIdAndDelete(userId);

      res.status(200).json({
        success: true,
        message: 'Xóa người dùng thành công'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Xóa người dùng thất bại'
      });
    }
  }

  // Thống kê doanh thu chi tiết với dữ liệu cho biểu đồ
  async getRevenueStats(req, res) {
    try {
      const { period = 'month', startDate, endDate } = req.query;

      let dateFilter = {};
      let groupFormat = {};

      // Set date range
      if (startDate && endDate) {
        dateFilter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else {
        // Default: last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        dateFilter.createdAt = { $gte: start, $lte: end };
      }

      // Get revenue by period
      if (period === 'day') {
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
      } else if (period === 'week') {
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
      } else {
        // month
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
      }

      // Get revenue data for chart
      const revenueData = await Booking.aggregate([
        {
          $match: {
            ...dateFilter,
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: groupFormat,
            revenue: { $sum: '$totalPrice' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 }
        }
      ]);

      // Format data for chart
      const chartData = revenueData.map(item => {
        let label = '';
        if (period === 'day') {
          label = `${item._id.day}/${item._id.month}/${item._id.year}`;
        } else if (period === 'week') {
          label = `Tuần ${item._id.week}/${item._id.year}`;
        } else {
          label = `Tháng ${item._id.month}/${item._id.year}`;
        }
        return {
          label,
          revenue: item.revenue,
          count: item.count
        };
      });

      // Get total stats
      const totalStats = await Booking.aggregate([
        {
          $match: {
            ...dateFilter,
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalPrice' },
            totalBookings: { $sum: 1 },
            avgRevenue: { $avg: '$totalPrice' }
          }
        }
      ]);

      // Get revenue by status
      const revenueByStatus = await Booking.aggregate([
        {
          $match: dateFilter
        },
        {
          $group: {
            _id: '$status',
            revenue: { $sum: '$totalPrice' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Get admin wallet
      const adminUsers = await User.find({ roleName: 'admin' }).select('_id');
      const adminUserIds = adminUsers.map(u => u._id);
      
      let adminWallet = null;
      if (adminUserIds.length > 0) {
        adminWallet = await Wallet.findOne({ user: { $in: adminUserIds } })
          .populate('user', 'username email');
        
        // If no wallet, create one for first admin
        if (!adminWallet && adminUserIds.length > 0) {
          const walletService = require('../services/walletService');
          adminWallet = await walletService.createWallet(adminUserIds[0]);
          adminWallet = await Wallet.findById(adminWallet._id)
            .populate('user', 'username email');
        }
      }

      // Get maintenance fee statistics (total collected from admin transactions)
      const Transaction = require('../models/Transaction');
      const maintenanceFeeStats = await Transaction.aggregate([
        {
          $match: {
            type: 'maintenance_fee',
            status: 'completed',
            user: { $in: adminUserIds },
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            totalMaintenanceFees: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      const maintenanceFeeData = maintenanceFeeStats[0] || {
        totalMaintenanceFees: 0,
        count: 0
      };

      res.status(200).json({
        success: true,
        data: {
          chartData,
          totalStats: totalStats[0] || {
            totalRevenue: 0,
            totalBookings: 0,
            avgRevenue: 0
          },
          revenueByStatus,
          adminWallet,
          maintenanceFeeStats: {
            totalMaintenanceFees: maintenanceFeeData.totalMaintenanceFees,
            count: maintenanceFeeData.count
          }
        }
      });
    } catch (error) {
      console.error('Get revenue stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy thống kê doanh thu'
      });
    }
  }

  // Lấy thống kê tổng quan
  async getDashboardStats(req, res) {
    try {
      // Get user counts by role
      const userStats = await User.aggregate([
        {
          $group: {
            _id: '$roleName',
            count: { $sum: 1 }
          }
        }
      ]);

      const roleStats = {
        user: 0,
        host: 0,
        admin: 0
      };

      userStats.forEach(stat => {
        if (stat._id) {
          roleStats[stat._id] = stat.count;
        }
      });

      // Get homestay stats
      const homestayStats = await Homestay.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const homestayCounts = {
        active: 0,
        pending: 0,
        rejected: 0
      };

      homestayStats.forEach(stat => {
        if (stat._id) {
          homestayCounts[stat._id] = stat.count;
        }
      });

      // Get booking stats
      const bookingStats = await Booking.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totalPrice' }
          }
        }
      ]);

      const bookingCounts = {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0
      };

      let totalRevenue = 0;
      let monthlyRevenue = 0;

      bookingStats.forEach(stat => {
        if (stat._id) {
          bookingCounts[stat._id] = stat.count;
        }
        if (stat._id === 'confirmed' || stat._id === 'completed') {
          totalRevenue += stat.revenue || 0;
        }
      });

      // Calculate monthly revenue
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyBookings = await Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            status: { $in: ['confirmed', 'completed'] },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalPrice' }
          }
        }
      ]);

      monthlyRevenue = monthlyBookings[0]?.revenue || 0;

      // Get pending host requests
      const pendingHostRequests = await HostRequest.countDocuments({ status: 'pending' });

      // Get admin wallet
      const adminUsers = await User.find({ roleName: 'admin' }).select('_id');
      const adminUserIds = adminUsers.map(u => u._id);
      
      let adminWallet = null;
      if (adminUserIds.length > 0) {
        adminWallet = await Wallet.findOne({ user: { $in: adminUserIds } })
          .populate('user', 'username email');
        
        if (!adminWallet && adminUserIds.length > 0) {
          const walletService = require('../services/walletService');
          adminWallet = await walletService.createWallet(adminUserIds[0]);
          adminWallet = await Wallet.findById(adminWallet._id)
            .populate('user', 'username email');
        }
      }

      res.status(200).json({
        success: true,
        data: {
          users: roleStats,
          homestays: {
            total: homestayCounts.active + homestayCounts.pending + homestayCounts.rejected,
            pending: homestayCounts.pending,
            active: homestayCounts.active
          },
          bookings: {
            total: bookingCounts.pending + bookingCounts.confirmed + bookingCounts.cancelled + bookingCounts.completed,
            pending: bookingCounts.pending,
            confirmed: bookingCounts.confirmed,
            completed: bookingCounts.completed
          },
          revenue: {
            total: totalRevenue,
            monthly: monthlyRevenue
          },
          pendingHostRequests,
          adminWallet
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy thống kê'
      });
    }
  }

  // [ADMIN] Chạy thủ công phí duy trì hàng tháng (cho testing hoặc xử lý lại)
  async processMaintenanceFeeManually(req, res) {
    try {
      const maintenanceFeeService = require('../services/maintenanceFeeService');
      
      console.log('Admin triggered manual maintenance fee processing');
      const result = await maintenanceFeeService.processMonthlyMaintenanceFee();

      res.status(200).json({
        success: true,
        message: 'Đã xử lý phí duy trì hàng tháng',
        data: result
      });
    } catch (error) {
      console.error('Error processing maintenance fee manually:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể xử lý phí duy trì'
      });
    }
  }
}

module.exports = new AdminController();
