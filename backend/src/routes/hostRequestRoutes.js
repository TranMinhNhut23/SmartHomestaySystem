const express = require('express');
const router = express.Router();
const hostRequestController = require('../controllers/hostRequestController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Tạo yêu cầu trở thành host (user)
router.post(
  '/',
  authenticate,
  hostRequestController.createHostRequest.bind(hostRequestController)
);

// Lấy yêu cầu của user
router.get(
  '/my-request',
  authenticate,
  hostRequestController.getMyHostRequest.bind(hostRequestController)
);

// Lấy tất cả yêu cầu (admin)
router.get(
  '/',
  authenticate,
  authorize('admin'),
  hostRequestController.getAllHostRequests.bind(hostRequestController)
);

// Lấy chi tiết yêu cầu
router.get(
  '/:id',
  authenticate,
  hostRequestController.getHostRequestById.bind(hostRequestController)
);

// Duyệt yêu cầu (admin)
router.put(
  '/:id/approve',
  authenticate,
  authorize('admin'),
  hostRequestController.approveHostRequest.bind(hostRequestController)
);

// Từ chối yêu cầu (admin)
router.put(
  '/:id/reject',
  authenticate,
  authorize('admin'),
  hostRequestController.rejectHostRequest.bind(hostRequestController)
);

module.exports = router;





