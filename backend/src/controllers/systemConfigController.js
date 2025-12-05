const SystemConfig = require('../models/SystemConfig');

class SystemConfigController {
  // Lấy cấu hình hệ thống
  async getConfig(req, res) {
    try {
      const config = await SystemConfig.getConfig();
      return res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting system config:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy cấu hình hệ thống',
        error: error.message
      });
    }
  }

  // Cập nhật cấu hình hệ thống
  async updateConfig(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      // Lấy config hiện tại hoặc tạo mới
      let config = await SystemConfig.findOne();
      
      if (!config) {
        config = await SystemConfig.getConfig();
      }

      // Cập nhật từng phần
      if (updateData.homepage) {
        if (updateData.homepage.bannerImages !== undefined) {
          config.homepage.bannerImages = updateData.homepage.bannerImages;
        }
        if (updateData.homepage.saleEvents !== undefined) {
          config.homepage.saleEvents = updateData.homepage.saleEvents;
        }
        if (updateData.homepage.categories !== undefined) {
          config.homepage.categories = updateData.homepage.categories;
        }
      }

      if (updateData.metadata !== undefined) {
        config.metadata = updateData.metadata;
      }

      config.updatedBy = userId;
      await config.save();

      return res.status(200).json({
        success: true,
        message: 'Cập nhật cấu hình thành công',
        data: config
      });
    } catch (error) {
      console.error('Error updating system config:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình hệ thống',
        error: error.message
      });
    }
  }

  // Cập nhật banner images
  async updateBannerImages(req, res) {
    try {
      const userId = req.user.id;
      const { bannerImages } = req.body;

      if (!Array.isArray(bannerImages)) {
        return res.status(400).json({
          success: false,
          message: 'bannerImages phải là một mảng'
        });
      }

      let config = await SystemConfig.findOne();
      if (!config) {
        config = await SystemConfig.getConfig();
      }

      config.homepage.bannerImages = bannerImages;
      config.updatedBy = userId;
      await config.save();

      return res.status(200).json({
        success: true,
        message: 'Cập nhật banner images thành công',
        data: config.homepage.bannerImages
      });
    } catch (error) {
      console.error('Error updating banner images:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật banner images',
        error: error.message
      });
    }
  }

  // Cập nhật sale events
  async updateSaleEvents(req, res) {
    try {
      const userId = req.user.id;
      const { saleEvents } = req.body;

      if (!Array.isArray(saleEvents)) {
        return res.status(400).json({
          success: false,
          message: 'saleEvents phải là một mảng'
        });
      }

      let config = await SystemConfig.findOne();
      if (!config) {
        config = await SystemConfig.getConfig();
      }

      config.homepage.saleEvents = saleEvents;
      config.updatedBy = userId;
      await config.save();

      return res.status(200).json({
        success: true,
        message: 'Cập nhật sale events thành công',
        data: config.homepage.saleEvents
      });
    } catch (error) {
      console.error('Error updating sale events:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật sale events',
        error: error.message
      });
    }
  }
}

module.exports = new SystemConfigController();
