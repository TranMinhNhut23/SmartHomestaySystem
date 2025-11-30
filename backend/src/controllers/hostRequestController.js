const hostRequestService = require('../services/hostRequestService');
const notificationService = require('../services/notificationService');

class HostRequestController {
  // Tạo yêu cầu trở thành host
  async createHostRequest(req, res) {
    try {
      const userId = req.user._id;
      const {
        fullName,
        dateOfBirth,
        address,
        idCardFront,
        idCardBack,
        reason,
        homestayProof,
        termsAccepted
      } = req.body;

      // Validation
      if (!fullName || !dateOfBirth || !address || !idCardFront || !idCardBack || !reason || !homestayProof) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin'
        });
      }

      if (!termsAccepted) {
        return res.status(400).json({
          success: false,
          message: 'Bạn phải đồng ý với điều khoản'
        });
      }

      const result = await hostRequestService.createHostRequest(userId, {
        fullName,
        dateOfBirth,
        address,
        idCardFront,
        idCardBack,
        reason,
        homestayProof,
        termsAccepted
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Error in createHostRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo yêu cầu thất bại'
      });
    }
  }

  // Lấy yêu cầu của user
  async getMyHostRequest(req, res) {
    try {
      const userId = req.user._id;
      const result = await hostRequestService.getMyHostRequest(userId);
      res.json(result);
    } catch (error) {
      console.error('Error in getMyHostRequest:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lấy yêu cầu thất bại'
      });
    }
  }

  // Lấy tất cả yêu cầu (admin)
  async getAllHostRequests(req, res) {
    try {
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await hostRequestService.getAllHostRequests({
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.json(result);
    } catch (error) {
      console.error('Error in getAllHostRequests:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lấy danh sách yêu cầu thất bại'
      });
    }
  }

  // Lấy chi tiết yêu cầu
  async getHostRequestById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?._id || null;
      const result = await hostRequestService.getHostRequestById(id, userId);
      res.json(result);
    } catch (error) {
      console.error('Error in getHostRequestById:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy yêu cầu'
      });
    }
  }

  // Duyệt yêu cầu (admin)
  async approveHostRequest(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const result = await hostRequestService.approveHostRequest(id, adminId);
      
      // Tạo notification cho user
      try {
        const request = result.data;
        const userId = typeof request.userId === 'object' 
          ? request.userId._id || request.userId 
          : request.userId;
        if (userId) {
          await notificationService.notifyHostRequestApproved(userId.toString());
        }
      } catch (notifError) {
        console.error('Error creating host request approval notification:', notifError);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error in approveHostRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Duyệt yêu cầu thất bại'
      });
    }
  }

  // Từ chối yêu cầu (admin)
  async rejectHostRequest(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;
      const result = await hostRequestService.rejectHostRequest(id, adminId, reason || '');
      
      // Tạo notification cho user
      try {
        const request = result.data;
        const userId = typeof request.userId === 'object' 
          ? request.userId._id || request.userId 
          : request.userId;
        if (userId) {
          await notificationService.notifyHostRequestRejected(userId.toString(), reason || '');
        }
      } catch (notifError) {
        console.error('Error creating host request rejection notification:', notifError);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error in rejectHostRequest:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Từ chối yêu cầu thất bại'
      });
    }
  }
}

module.exports = new HostRequestController();





