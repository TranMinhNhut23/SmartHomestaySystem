const couponService = require('../services/couponService');

class CouponController {
  // Validate mã giảm giá (user)
  async validateCoupon(req, res) {
    try {
      const { code, totalPrice, homestayId } = req.body;
      const userId = req.userId;

      if (!code || !totalPrice) {
        return res.status(400).json({
          success: false,
          message: 'Mã giảm giá và tổng giá là bắt buộc'
        });
      }

      const result = await couponService.validateAndApplyCoupon(
        code,
        parseFloat(totalPrice),
        userId,
        null,
        homestayId
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Validate coupon error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Mã giảm giá không hợp lệ'
      });
    }
  }

  // Lấy danh sách coupons active (user)
  async getActiveCoupons(req, res) {
    try {
      console.log('Getting active coupons...');
      const coupons = await couponService.getActiveCoupons();
      console.log(`Found ${coupons.length} active coupons`);
      
      res.status(200).json({
        success: true,
        data: coupons
      });
    } catch (error) {
      console.error('Get active coupons error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách mã giảm giá'
      });
    }
  }

  // Tạo coupon mới (admin)
  async createCoupon(req, res) {
    try {
      const creatorId = req.userId;
      const coupon = await couponService.createCoupon(req.body, creatorId);

      res.status(201).json({
        success: true,
        data: coupon,
        message: 'Tạo mã giảm giá thành công'
      });
    } catch (error) {
      console.error('Create coupon error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo mã giảm giá thất bại'
      });
    }
  }

  // Lấy tất cả coupons (admin)
  async getAllCoupons(req, res) {
    try {
      const { status, page, limit } = req.query;
      const options = {
        status: status || undefined,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await couponService.getAllCoupons(options, {
        userId: req.userId,
        roleName: req.userRoleName || req.userRole || req.roleName || undefined
      });

      res.status(200).json({
        success: true,
        data: result.coupons,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all coupons error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách mã giảm giá'
      });
    }
  }

  // Lấy coupon theo ID (admin)
  async getCouponById(req, res) {
    try {
      const { id } = req.params;
      const coupon = await couponService.getCouponById(id);

      res.status(200).json({
        success: true,
        data: coupon
      });
    } catch (error) {
      console.error('Get coupon by id error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Mã giảm giá không tồn tại'
      });
    }
  }

  // Cập nhật coupon
  async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const updaterId = req.userId;
      const updaterRole = req.userRoleName || req.userRole || req.roleName || undefined;
      const coupon = await couponService.updateCoupon(id, req.body, updaterId, updaterRole);

      res.status(200).json({
        success: true,
        data: coupon,
        message: 'Cập nhật mã giảm giá thành công'
      });
    } catch (error) {
      console.error('Update coupon error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật mã giảm giá thất bại'
      });
    }
  }

  // Xóa coupon
  async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      const deleterId = req.userId;
      const deleterRole = req.userRoleName || req.userRole || req.roleName || undefined;
      const result = await couponService.deleteCoupon(id, deleterId, deleterRole);

      res.status(200).json({
        success: true,
        message: result.message || 'Xóa mã giảm giá thành công'
      });
    } catch (error) {
      console.error('Delete coupon error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa mã giảm giá thất bại'
      });
    }
  }
}

module.exports = new CouponController();

