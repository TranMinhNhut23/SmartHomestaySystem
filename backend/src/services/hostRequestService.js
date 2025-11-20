const HostRequest = require('../models/HostRequest');
const User = require('../models/User');
const Role = require('../models/Role');
const uploadService = require('./uploadService');

class HostRequestService {
  // Tạo yêu cầu trở thành host
  async createHostRequest(userId, requestData) {
    try {
      // Kiểm tra user đã có role host chưa
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User không tồn tại');
      }

      if (user.roleName === 'host') {
        throw new Error('Bạn đã là host rồi');
      }

      // Kiểm tra đã có request pending chưa
      const existingRequest = await HostRequest.findOne({
        userId,
        status: 'pending'
      });

      if (existingRequest) {
        throw new Error('Bạn đã có yêu cầu đang chờ duyệt');
      }

      // Lưu ảnh CCCD
      const idCardFrontUrl = await uploadService.saveIdCardImage(
        requestData.idCardFront,
        userId,
        'front'
      );

      const idCardBackUrl = await uploadService.saveIdCardImage(
        requestData.idCardBack,
        userId,
        'back'
      );

      if (!idCardFrontUrl || !idCardBackUrl) {
        throw new Error('Không thể lưu ảnh CCCD');
      }

      // Tạo host request
      const hostRequest = new HostRequest({
        userId,
        fullName: requestData.fullName,
        dateOfBirth: requestData.dateOfBirth,
        address: requestData.address,
        idCardFront: idCardFrontUrl,
        idCardBack: idCardBackUrl,
        reason: requestData.reason,
        homestayProof: requestData.homestayProof,
        termsAccepted: requestData.termsAccepted || false
      });

      await hostRequest.save();
      await hostRequest.populate('userId', 'username email');

      return {
        success: true,
        data: hostRequest,
        message: 'Gửi yêu cầu thành công'
      };
    } catch (error) {
      console.error('Error creating host request:', error);
      throw error;
    }
  }

  // Lấy yêu cầu của user
  async getMyHostRequest(userId) {
    try {
      const requests = await HostRequest.find({ userId })
        .sort({ createdAt: -1 })
        .populate('userId', 'username email')
        .populate('reviewedBy', 'username email');

      return {
        success: true,
        data: requests,
        message: 'Lấy danh sách yêu cầu thành công'
      };
    } catch (error) {
      console.error('Error getting host requests:', error);
      throw error;
    }
  }

  // Lấy tất cả yêu cầu (cho admin)
  async getAllHostRequests(options = {}) {
    try {
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = {};
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [requests, total] = await Promise.all([
        HostRequest.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'username email avatar')
          .populate('reviewedBy', 'username email'),
        HostRequest.countDocuments(query)
      ]);

      return {
        success: true,
        data: {
          requests,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        },
        message: 'Lấy danh sách yêu cầu thành công'
      };
    } catch (error) {
      console.error('Error getting all host requests:', error);
      throw error;
    }
  }

  // Lấy chi tiết yêu cầu
  async getHostRequestById(requestId, userId = null) {
    try {
      const query = { _id: requestId };
      
      // Nếu không phải admin, chỉ cho xem request của chính mình
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.roleName !== 'admin') {
          query.userId = userId;
        }
      }

      const request = await HostRequest.findOne(query)
        .populate('userId', 'username email avatar')
        .populate('reviewedBy', 'username email');

      if (!request) {
        throw new Error('Không tìm thấy yêu cầu');
      }

      return {
        success: true,
        data: request,
        message: 'Lấy thông tin yêu cầu thành công'
      };
    } catch (error) {
      console.error('Error getting host request by id:', error);
      throw error;
    }
  }

  // Duyệt yêu cầu (admin)
  async approveHostRequest(requestId, adminId) {
    try {
      const request = await HostRequest.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy yêu cầu');
      }

      if (request.status !== 'pending') {
        throw new Error('Yêu cầu này đã được xử lý rồi');
      }

      // Cập nhật role của user thành host
      const user = await User.findById(request.userId);
      if (!user) {
        throw new Error('User không tồn tại');
      }

      // Lấy role host
      const hostRole = await Role.findOne({ name: 'host' });
      if (!hostRole) {
        throw new Error('Role host không tồn tại');
      }

      user.role = hostRole._id;
      user.roleName = 'host';
      await user.save();

      // Cập nhật request
      request.status = 'approved';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();

      await request.populate('userId', 'username email');
      await request.populate('reviewedBy', 'username email');

      return {
        success: true,
        data: request,
        message: 'Duyệt yêu cầu thành công'
      };
    } catch (error) {
      console.error('Error approving host request:', error);
      throw error;
    }
  }

  // Từ chối yêu cầu (admin)
  async rejectHostRequest(requestId, adminId, reason = '') {
    try {
      const request = await HostRequest.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy yêu cầu');
      }

      if (request.status !== 'pending') {
        throw new Error('Yêu cầu này đã được xử lý rồi');
      }

      // Cập nhật request
      request.status = 'rejected';
      request.rejectedReason = reason;
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();

      await request.populate('userId', 'username email');
      await request.populate('reviewedBy', 'username email');

      return {
        success: true,
        data: request,
        message: 'Từ chối yêu cầu thành công'
      };
    } catch (error) {
      console.error('Error rejecting host request:', error);
      throw error;
    }
  }
}

module.exports = new HostRequestService();





