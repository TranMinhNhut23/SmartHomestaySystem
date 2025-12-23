const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Log khi routes được load
console.log('Complaint routes loaded');

// Tất cả routes đều cần đăng nhập
router.use(authenticate);

// User routes
router.post('/', complaintController.createComplaint.bind(complaintController));
router.get('/my-complaints', complaintController.getMyComplaints.bind(complaintController));
router.get('/:complaintId', complaintController.getComplaintById.bind(complaintController));
router.post('/:complaintId/feedback', complaintController.addFeedback.bind(complaintController));

// Admin routes
router.get('/', authorize('admin'), complaintController.getAllComplaints.bind(complaintController));
router.put('/:complaintId/status', authorize('admin'), complaintController.updateComplaintStatus.bind(complaintController));

module.exports = router;








