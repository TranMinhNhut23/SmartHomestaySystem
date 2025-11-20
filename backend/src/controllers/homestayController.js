const homestayService = require('../services/homestayService');

class HomestayController {
  // Tạo homestay mới
  async createHomestay(req, res) {
    try {
      const {
        name,
        description,
        address,
        googleMapsEmbed,
        pricePerNight,
        images,
        featured,
        requireDeposit,
        rooms,
        amenities
      } = req.body;

      // Validation cơ bản
      if (!name || !description || !address) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin bắt buộc: tên, mô tả, địa chỉ'
        });
      }

      // Validate address
      if (!address.province || !address.district || !address.ward || !address.street) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin địa chỉ: tỉnh/thành, quận/huyện, phường/xã, số nhà/tên đường'
        });
      }

      // Validate images
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một ảnh'
        });
      }

      // Validate rooms
      if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng thêm ít nhất một phòng'
        });
      }

      // Validate amenities (không bắt buộc nhưng nếu có thì phải là array)
      if (amenities && !Array.isArray(amenities)) {
        return res.status(400).json({
          success: false,
          message: 'Tiện nghi phải là mảng'
        });
      }

      // Validate price (nếu có)
      if (pricePerNight !== undefined && pricePerNight < 0) {
        return res.status(400).json({
          success: false,
          message: 'Giá mỗi đêm phải lớn hơn hoặc bằng 0'
        });
      }

      // Lấy hostId từ request (đã được set bởi authenticate middleware)
      const hostId = req.userId;
      
      console.log('Creating homestay for host:', hostId);
      console.log('Request body rooms:', JSON.stringify(rooms, null, 2));

      // Tạo homestay
      const homestay = await homestayService.createHomestay(
        {
          name,
          description,
          address,
          googleMapsEmbed,
          pricePerNight,
          images,
          featured,
          requireDeposit,
          rooms,
          amenities
        },
        hostId
      );

      res.status(201).json({
        success: true,
        message: 'Tạo homestay thành công',
        data: homestay
      });
    } catch (error) {
      console.error('Create homestay error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo homestay thất bại'
      });
    }
  }

  // Lấy danh sách tỉnh thành
  async getProvinces(req, res) {
    try {
      const provinces = await homestayService.getProvinces();

      res.status(200).json({
        success: true,
        data: provinces
      });
    } catch (error) {
      console.error('Get provinces error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách tỉnh thành'
      });
    }
  }

  // Lấy danh sách quận/huyện theo mã tỉnh/thành
  async getDistricts(req, res) {
    try {
      const { provinceCode } = req.params;

      if (!provinceCode) {
        return res.status(400).json({
          success: false,
          message: 'Mã tỉnh/thành là bắt buộc'
        });
      }

      const districts = await homestayService.getDistricts(provinceCode);

      res.status(200).json({
        success: true,
        data: districts
      });
    } catch (error) {
      console.error('Get districts error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách quận/huyện'
      });
    }
  }

  // Lấy danh sách phường/xã theo mã quận/huyện
  async getWards(req, res) {
    try {
      const { districtCode } = req.params;

      if (!districtCode) {
        return res.status(400).json({
          success: false,
          message: 'Mã quận/huyện là bắt buộc'
        });
      }

      const wards = await homestayService.getWards(districtCode);

      res.status(200).json({
        success: true,
        data: wards
      });
    } catch (error) {
      console.error('Get wards error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách phường/xã'
      });
    }
  }

  // Lấy tất cả homestay công khai (chỉ active)
  async getAllHomestays(req, res) {
    try {
      const { featured, province, district, page, limit } = req.query;

      const options = {
        status: 'active', // Chỉ lấy homestay active
        featured: featured !== undefined ? featured === 'true' : undefined,
        province,
        district,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await homestayService.getAllHomestays(options);

      res.status(200).json({
        success: true,
        data: result.homestays,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all homestays error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách homestay'
      });
    }
  }

  // Lấy danh sách homestay của host
  async getHostHomestays(req, res) {
    try {
      const hostId = req.userId;
      const { status, featured, page, limit } = req.query;

      const options = {
        status,
        featured: featured !== undefined ? featured === 'true' : undefined,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      };

      const result = await homestayService.getHostHomestays(hostId, options);

      res.status(200).json({
        success: true,
        data: result.homestays,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get host homestays error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách homestay'
      });
    }
  }

  // Lấy thông tin chi tiết homestay
  async getHomestayById(req, res) {
    try {
      const { id } = req.params;
      console.log('getHomestayById called with id:', id);
      console.log('Request path:', req.path);
      console.log('Request method:', req.method);

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID homestay là bắt buộc'
        });
      }

      // Validate ObjectId format
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ObjectId format:', id);
        return res.status(400).json({
          success: false,
          message: 'ID homestay không hợp lệ'
        });
      }

      console.log('Calling homestayService.getHomestayById with id:', id);
      const homestay = await homestayService.getHomestayById(id);
      console.log('Homestay found:', !!homestay);

      res.status(200).json({
        success: true,
        data: homestay
      });
    } catch (error) {
      console.error('Get homestay error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy homestay'
      });
    }
  }

  // Cập nhật homestay
  async updateHomestay(req, res) {
    try {
      const { id } = req.params;
      console.log('updateHomestay called with id:', id);
      console.log('Request method:', req.method);
      console.log('Request path:', req.path);
      console.log('Request body keys:', Object.keys(req.body || {}));
      
      const {
        name,
        description,
        address,
        googleMapsEmbed,
        pricePerNight,
        images,
        featured,
        requireDeposit,
        rooms,
        amenities
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID homestay là bắt buộc'
        });
      }

      // Validate ObjectId format
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ObjectId format:', id);
        return res.status(400).json({
          success: false,
          message: 'ID homestay không hợp lệ'
        });
      }

      const hostId = req.userId;
      console.log('Host ID:', hostId);

      const homestay = await homestayService.updateHomestay(
        id,
        {
          name,
          description,
          address,
          googleMapsEmbed,
          pricePerNight,
          images,
          featured,
          requireDeposit,
          rooms,
          amenities
        },
        hostId
      );

      res.status(200).json({
        success: true,
        message: 'Cập nhật homestay thành công',
        data: homestay
      });
    } catch (error) {
      console.error('Update homestay error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật homestay thất bại'
      });
    }
  }

  // Duyệt homestay (admin)
  async approveHomestay(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.userId;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID homestay là bắt buộc'
        });
      }

      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID homestay không hợp lệ'
        });
      }

      const homestay = await homestayService.approveHomestay(id, adminId);

      res.status(200).json({
        success: true,
        message: 'Duyệt homestay thành công',
        data: homestay
      });
    } catch (error) {
      console.error('Approve homestay error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Duyệt homestay thất bại'
      });
    }
  }

  // Từ chối homestay (admin)
  async rejectHomestay(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.userId;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID homestay là bắt buộc'
        });
      }

      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID homestay không hợp lệ'
        });
      }

      const homestay = await homestayService.rejectHomestay(id, adminId, reason);

      res.status(200).json({
        success: true,
        message: 'Từ chối homestay thành công',
        data: homestay
      });
    } catch (error) {
      console.error('Reject homestay error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Từ chối homestay thất bại'
      });
    }
  }

  // Lấy danh sách homestay đang chờ duyệt (admin)
  async getPendingHomestays(req, res) {
    try {
      const { page, limit } = req.query;

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      };

      const result = await homestayService.getPendingHomestays(options);

      res.status(200).json({
        success: true,
        data: result.homestays,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get pending homestays error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Không thể lấy danh sách homestay chờ duyệt'
      });
    }
  }
}

module.exports = new HomestayController();


