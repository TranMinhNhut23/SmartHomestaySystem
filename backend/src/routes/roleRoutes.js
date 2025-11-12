const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// Lấy tất cả roles (mọi user đã đăng nhập)
router.get('/', roleController.getAllRoles.bind(roleController));

// Lấy roles với số lượng users
router.get('/with-count', roleController.getRolesWithUserCount.bind(roleController));

// Lấy role theo ID
router.get('/:id', roleController.getRoleById.bind(roleController));

// Tạo role mới (chỉ admin)
router.post('/', authorize('admin'), roleController.createRole.bind(roleController));

// Cập nhật role (chỉ admin)
router.put('/:id', authorize('admin'), roleController.updateRole.bind(roleController));

// Xóa role (soft delete) (chỉ admin)
router.delete('/:id', authorize('admin'), roleController.deleteRole.bind(roleController));

// Xóa vĩnh viễn role (chỉ admin)
router.delete('/:id/hard', authorize('admin'), roleController.hardDeleteRole.bind(roleController));

// Thêm permission vào role (chỉ admin)
router.post('/:id/permissions', authorize('admin'), roleController.addPermission.bind(roleController));

// Xóa permission khỏi role (chỉ admin)
router.delete('/:id/permissions', authorize('admin'), roleController.removePermission.bind(roleController));

module.exports = router;


