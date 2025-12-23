const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');

class ComplaintController {
  // User tạo khiếu nại mới
  async createComplaint(req, res) {
    try {
      const { type, title, content, relatedEntity, priority, attachments } = req.body;
      const userId = req.userId;

      // Validation
      if (!type || !title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin: loại, tiêu đề, nội dung'
        });
      }

      if (title.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Tiêu đề phải có ít nhất 5 ký tự'
        });
      }

      if (content.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Nội dung phải có ít nhất 10 ký tự'
        });
      }

      // Tạo khiếu nại
      const complaint = new Complaint({
        user: userId,
        type,
        title: title.trim(),
        content: content.trim(),
        relatedEntity: relatedEntity || null,
        priority: priority || 'medium',
        attachments: attachments || [],
        status: 'pending'
      });

      await complaint.save();

      // Populate user info
      await complaint.populate('user', 'username email');

      // Tạo thông báo cho admin (tùy chọn - có thể implement sau)
      try {
        const admins = await User.find({ roleName: 'admin' }).select('_id');
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            type: 'system_announcement',
            title: 'Có khiếu nại mới',
            message: `User ${complaint.user.username} đã gửi khiếu nại: ${complaint.title}`,
            data: {
              complaintId: complaint._id,
              complaintType: complaint.type
            },
            role: 'admin'
          });
        }
      } catch (notifError) {
        console.error('Error creating admin notifications:', notifError);
        // Không fail request nếu không tạo được notification
      }

      res.status(201).json({
        success: true,
        message: 'Gửi khiếu nại thành công',
        data: complaint
      });
    } catch (error) {
      console.error('Create complaint error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể gửi khiếu nại'
      });
    }
  }

  // User xem danh sách khiếu nại của mình
  async getMyComplaints(req, res) {
    try {
      const userId = req.userId;
      const {
        status,
        type,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = { user: userId };
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }

      // Count total
      const total = await Complaint.countDocuments(query);

      // Get complaints
      const complaints = await Complaint.find(query)
        .populate('user', 'username email')
        .populate('adminResponse.respondedBy', 'username email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          complaints,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get my complaints error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách khiếu nại'
      });
    }
  }

  // Xem chi tiết khiếu nại (user chỉ xem được của mình, admin xem được tất cả)
  async getComplaintById(req, res) {
    try {
      const { complaintId } = req.params;
      const userId = req.userId;
      const userRole = req.user.roleName;

      const complaint = await Complaint.findById(complaintId)
        .populate('user', 'username email')
        .populate('adminResponse.respondedBy', 'username email');

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khiếu nại'
        });
      }

      // User chỉ xem được khiếu nại của mình, admin xem được tất cả
      if (userRole !== 'admin' && complaint.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem khiếu nại này'
        });
      }

      res.status(200).json({
        success: true,
        data: complaint
      });
    } catch (error) {
      console.error('Get complaint by id error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy thông tin khiếu nại'
      });
    }
  }

  // Admin xem tất cả khiếu nại
  async getAllComplaints(req, res) {
    try {
      const {
        status,
        type,
        priority,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query
      const query = {};
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }

      if (priority) {
        query.priority = priority;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }

      // Count total
      const total = await Complaint.countDocuments(query);

      // Get complaints
      const complaints = await Complaint.find(query)
        .populate('user', 'username email phone')
        .populate('adminResponse.respondedBy', 'username email')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Get stats
      const stats = await Complaint.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusStats = {
        pending: 0,
        in_progress: 0,
        resolved: 0,
        rejected: 0
      };

      stats.forEach(stat => {
        if (stat._id) {
          statusStats[stat._id] = stat.count;
        }
      });

      res.status(200).json({
        success: true,
        data: {
          complaints,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          },
          stats: statusStats
        }
      });
    } catch (error) {
      console.error('Get all complaints error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách khiếu nại'
      });
    }
  }

  // Admin cập nhật trạng thái và phản hồi khiếu nại
  async updateComplaintStatus(req, res) {
    try {
      const { complaintId } = req.params;
      const { status, response } = req.body;
      const adminId = req.userId;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái là bắt buộc'
        });
      }

      const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái không hợp lệ'
        });
      }

      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khiếu nại'
        });
      }

      // Cập nhật trạng thái và phản hồi
      await complaint.updateStatus(status, adminId, response);

      // Populate lại để trả về đầy đủ thông tin
      await complaint.populate('user', 'username email');
      await complaint.populate('adminResponse.respondedBy', 'username email');

      // Gửi email phản hồi cho user (chỉ khi có response hoặc status thay đổi)
      if (complaint.user?.email && (response || status !== 'pending')) {
        try {
          await emailService.sendComplaintResponseEmail(complaint, complaint.user.email);
          console.log(`Complaint response email sent to ${complaint.user.email}`);
        } catch (emailError) {
          console.error('Error sending complaint response email:', emailError);
          // Không fail request nếu email gửi thất bại
        }
      }

      // Tạo thông báo cho user
      try {
        await Notification.create({
          user: complaint.user._id,
          type: 'system_announcement',
          title: 'Cập nhật khiếu nại',
          message: `Khiếu nại của bạn đã được cập nhật: ${this.getStatusText(status)}${response ? '. Bạn đã nhận được phản hồi từ admin.' : ''}`,
          data: {
            complaintId: complaint._id,
            status: status
          },
          role: 'user'
        });
      } catch (notifError) {
        console.error('Error creating user notification:', notifError);
      }

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: complaint
      });
    } catch (error) {
      console.error('Update complaint status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể cập nhật trạng thái'
      });
    }
  }

  // User đánh giá việc xử lý khiếu nại
  async addFeedback(req, res) {
    try {
      const { complaintId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.userId;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Đánh giá phải từ 1 đến 5 sao'
        });
      }

      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khiếu nại'
        });
      }

      // Chỉ user tạo khiếu nại mới được đánh giá
      if (complaint.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền đánh giá khiếu nại này'
        });
      }

      // Chỉ đánh giá được khi đã resolved
      if (complaint.status !== 'resolved') {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể đánh giá khiếu nại đã được giải quyết'
        });
      }

      await complaint.addUserFeedback(rating, comment);
      await complaint.populate('user', 'username email');

      res.status(200).json({
        success: true,
        message: 'Đánh giá thành công',
        data: complaint
      });
    } catch (error) {
      console.error('Add feedback error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể thêm đánh giá'
      });
    }
  }

  // Helper method để chuyển status thành text tiếng Việt
  getStatusText(status) {
    const statusMap = {
      pending: 'Đang chờ xử lý',
      in_progress: 'Đang xử lý',
      resolved: 'Đã giải quyết',
      rejected: 'Đã từ chối'
    };
    return statusMap[status] || status;
  }
}

module.exports = new ComplaintController();

