const express = require('express');
const router = express.Router();
const homestayController = require('../controllers/homestayController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Lấy tất cả homestay công khai (không cần đăng nhập) - CHỈ hiển thị active
// PHẢI ĐẶT TRƯỚC route /:id để tránh conflict
router.get('/', homestayController.getAllHomestays.bind(homestayController));

// Lấy danh sách tỉnh thành (không cần đăng nhập) - ĐẶT TRƯỚC route /:id
router.get('/provinces', homestayController.getProvinces.bind(homestayController));

// Lấy danh sách quận/huyện theo mã tỉnh/thành (không cần đăng nhập)
router.get('/provinces/:provinceCode/districts', homestayController.getDistricts.bind(homestayController));

// Lấy danh sách phường/xã theo mã quận/huyện (không cần đăng nhập)
router.get('/districts/:districtCode/wards', homestayController.getWards.bind(homestayController));

// Lấy danh sách homestay của host (chỉ host) - ĐẶT TRƯỚC route /:id
router.get(
  '/my-homestays',
  authenticate,
  authorize('host'),
  homestayController.getHostHomestays.bind(homestayController)
);

// Tạo homestay mới (chỉ host)
router.post(
  '/',
  authenticate,
  authorize('host'),
  homestayController.createHomestay.bind(homestayController)
);

// Cập nhật homestay (chỉ host sở hữu) - ĐẶT TRƯỚC route GET /:id để tránh conflict
router.put(
  '/:id',
  (req, res, next) => {
    console.log('PUT /:id route matched, id:', req.params.id);
    next();
  },
  authenticate,
  authorize('host'),
  homestayController.updateHomestay.bind(homestayController)
);

// Lấy danh sách homestay đang chờ duyệt (chỉ admin) - ĐẶT TRƯỚC route /:id
router.get(
  '/pending',
  authenticate,
  authorize('admin'),
  homestayController.getPendingHomestays.bind(homestayController)
);

// Duyệt homestay (chỉ admin) - ĐẶT TRƯỚC route /:id
router.put(
  '/:id/approve',
  authenticate,
  authorize('admin'),
  homestayController.approveHomestay.bind(homestayController)
);

// Từ chối homestay (chỉ admin) - ĐẶT TRƯỚC route /:id
router.put(
  '/:id/reject',
  authenticate,
  authorize('admin'),
  homestayController.rejectHomestay.bind(homestayController)
);

// Lấy thời tiết cho homestay (không cần đăng nhập) - ĐẶT TRƯỚC route /:id
router.get(
  '/:id/weather',
  homestayController.getHomestayWeather.bind(homestayController)
);

// Lấy thông tin chi tiết homestay (không cần đăng nhập) - ĐẶT CUỐI CÙNG
router.get(
  '/:id',
  homestayController.getHomestayById.bind(homestayController)
);

module.exports = router;


