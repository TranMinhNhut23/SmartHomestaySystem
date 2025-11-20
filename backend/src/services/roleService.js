const Role = require('../models/Role');

class RoleService {
  // Tạo role mới
  async createRole(roleData) {
    const { name, description, permissions } = roleData;

    // Kiểm tra role đã tồn tại
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      throw new Error('Role đã tồn tại');
    }

    const role = new Role({
      name: name.toLowerCase(),
      description: description || '',
      permissions: permissions || [],
      isActive: true
    });

    await role.save();
    return role;
  }

  // Lấy tất cả roles
  async getAllRoles(filters = {}) {
    const { isActive, search } = filters;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const roles = await Role.find(query).sort({ createdAt: -1 });
    return roles;
  }

  // Lấy role theo ID
  async getRoleById(roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role không tồn tại');
    }
    return role;
  }

  // Lấy role theo name
  async getRoleByName(name) {
    const role = await Role.findOne({ name: name.toLowerCase() });
    if (!role) {
      throw new Error('Role không tồn tại');
    }
    return role;
  }

  // Cập nhật role
  async updateRole(roleId, updateData) {
    const { name, description, permissions, isActive } = updateData;

    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role không tồn tại');
    }

    // Kiểm tra nếu đổi tên và tên mới đã tồn tại
    if (name && name.toLowerCase() !== role.name) {
      const existingRole = await Role.findOne({ name: name.toLowerCase() });
      if (existingRole) {
        throw new Error('Tên role đã tồn tại');
      }
      role.name = name.toLowerCase();
    }

    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    role.updatedAt = new Date();
    await role.save();
    return role;
  }

  // Xóa role (soft delete)
  async deleteRole(roleId) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role không tồn tại');
    }

    role.isActive = false;
    await role.save();
    return role;
  }

  // Xóa vĩnh viễn role
  async hardDeleteRole(roleId) {
    const role = await Role.findByIdAndDelete(roleId);
    if (!role) {
      throw new Error('Role không tồn tại');
    }
    return role;
  }

  // Thêm permission vào role
  async addPermission(roleId, permission) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role không tồn tại');
    }

    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
      role.updatedAt = new Date();
      await role.save();
    }

    return role;
  }

  // Xóa permission khỏi role
  async removePermission(roleId, permission) {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error('Role không tồn tại');
    }

    role.permissions = role.permissions.filter(p => p !== permission);
    role.updatedAt = new Date();
    await role.save();
    return role;
  }

  // Lấy roles với số lượng users
  async getRolesWithUserCount() {
    const User = require('../models/User');
    const roles = await Role.find({ isActive: true });
    
    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role._id });
        return {
          ...role.toObject(),
          userCount
        };
      })
    );

    return rolesWithCount;
  }
}

module.exports = new RoleService();













