const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const systemConfigController = require('../controllers/systemConfigController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Tất cả routes đều cần admin role
router.use(authenticate);
router.use(authorize('admin'));

// User management
router.get('/users', adminController.getAllUsers.bind(adminController));
router.get('/users/:userId', adminController.getUserById.bind(adminController));
router.put('/users/:userId', adminController.updateUser.bind(adminController));
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus.bind(adminController));
router.delete('/users/:userId', adminController.deleteUser.bind(adminController));

// Statistics
router.get('/stats/dashboard', adminController.getDashboardStats.bind(adminController));
router.get('/stats/revenue', adminController.getRevenueStats.bind(adminController));

// Maintenance fee management
router.post('/maintenance-fee/process', adminController.processMaintenanceFeeManually.bind(adminController));

// System Config management
router.get('/system-config', systemConfigController.getConfig.bind(systemConfigController));
router.put('/system-config', systemConfigController.updateConfig.bind(systemConfigController));
router.put('/system-config/banner-images', systemConfigController.updateBannerImages.bind(systemConfigController));
router.put('/system-config/sale-events', systemConfigController.updateSaleEvents.bind(systemConfigController));

module.exports = router;
