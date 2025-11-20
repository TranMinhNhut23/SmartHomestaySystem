const roleService = require('../services/roleService');

class RoleController {
  // Tạo role mới
  async createRole(req, res) {
    try {
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Tên role là bắt buộc'
        });
      }

      const role = await roleService.createRole({
        name,
        description,
        permissions
      });

      res.status(201).json({
        success: true,
        message: 'Tạo role thành công',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Tạo role thất bại'
      });
    }
  }

  // Lấy tất cả roles
  async getAllRoles(req, res) {
    try {
      const { isActive, search } = req.query;
      const filters = {};

      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      if (search) {
        filters.search = search;
      }

      const roles = await roleService.getAllRoles(filters);

      res.status(200).json({
        success: true,
        data: roles,
        count: roles.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách roles'
      });
    }
  }

  // Lấy role theo ID
  async getRoleById(req, res) {
    try {
      const { id } = req.params;
      const role = await roleService.getRoleById(id);

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy role'
      });
    }
  }

  // Cập nhật role
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const role = await roleService.updateRole(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Cập nhật role thành công',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Cập nhật role thất bại'
      });
    }
  }

  // Xóa role (soft delete)
  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const role = await roleService.deleteRole(id);

      res.status(200).json({
        success: true,
        message: 'Xóa role thành công',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa role thất bại'
      });
    }
  }

  // Xóa vĩnh viễn role
  async hardDeleteRole(req, res) {
    try {
      const { id } = req.params;
      const role = await roleService.hardDeleteRole(id);

      res.status(200).json({
        success: true,
        message: 'Xóa vĩnh viễn role thành công',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa role thất bại'
      });
    }
  }

  // Thêm permission vào role
  async addPermission(req, res) {
    try {
      const { id } = req.params;
      const { permission } = req.body;

      if (!permission) {
        return res.status(400).json({
          success: false,
          message: 'Permission là bắt buộc'
        });
      }

      const role = await roleService.addPermission(id, permission);

      res.status(200).json({
        success: true,
        message: 'Thêm permission thành công',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Thêm permission thất bại'
      });
    }
  }

  // Xóa permission khỏi role
  async removePermission(req, res) {
    try {
      const { id } = req.params;
      const { permission } = req.body;

      if (!permission) {
        return res.status(400).json({
          success: false,
          message: 'Permission là bắt buộc'
        });
      }

      const role = await roleService.removePermission(id, permission);

      res.status(200).json({
        success: true,
        message: 'Xóa permission thành công',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Xóa permission thất bại'
      });
    }
  }

  // Lấy roles với số lượng users
  async getRolesWithUserCount(req, res) {
    try {
      const roles = await roleService.getRolesWithUserCount();

      res.status(200).json({
        success: true,
        data: roles,
        count: roles.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách roles'
      });
    }
  }
}

module.exports = new RoleController();













