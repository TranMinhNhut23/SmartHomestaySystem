const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notification = require('./src/models/Notification');
const User = require('./src/models/User');

dotenv.config();

async function createTestNotifications() {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smarthomestay');
    console.log('✅ Đã kết nối database');

    // Lấy user đầu tiên (hoặc user cụ thể)
    const user = await User.findOne();
    if (!user) {
      console.error('❌ Không tìm thấy user nào trong database');
      process.exit(1);
    }

    console.log(`📝 Tạo notifications cho user: ${user.username} (${user._id})`);

    // Tạo các notifications mẫu
    const testNotifications = [
      {
        user: user._id,
        type: 'booking_created',
        title: 'Đặt phòng thành công',
        message: 'Bạn đã đặt phòng tại Homestay Test. Vui lòng chờ xác nhận từ chủ nhà.',
        role: user.roleName || 'user',
        isRead: false,
        data: {
          bookingId: 'test_booking_1',
          homestayId: 'test_homestay_1'
        }
      },
      {
        user: user._id,
        type: 'booking_confirmed',
        title: 'Đặt phòng đã được xác nhận',
        message: 'Đặt phòng tại Homestay Test đã được xác nhận. Vui lòng thanh toán để hoàn tất.',
        role: user.roleName || 'user',
        isRead: false,
        data: {
          bookingId: 'test_booking_1',
          homestayId: 'test_homestay_1'
        }
      },
      {
        user: user._id,
        type: 'payment_success',
        title: 'Thanh toán thành công',
        message: 'Bạn đã thanh toán thành công 1,000,000 VNĐ cho đặt phòng tại Homestay Test.',
        role: user.roleName || 'user',
        isRead: false,
        data: {
          bookingId: 'test_booking_1',
          homestayId: 'test_homestay_1'
        }
      },
      {
        user: user._id,
        type: 'system_announcement',
        title: 'Thông báo hệ thống',
        message: 'Chào mừng bạn đến với Smart Homestay System! Hệ thống đã được cập nhật với tính năng thông báo mới.',
        role: user.roleName || 'user',
        isRead: true,
        data: {}
      }
    ];

    // Xóa notifications cũ của user (tùy chọn)
    // await Notification.deleteMany({ user: user._id });
    // console.log('🗑️  Đã xóa notifications cũ');

    // Tạo notifications mới
    const created = await Notification.insertMany(testNotifications);
    console.log(`✅ Đã tạo ${created.length} notifications mẫu:`);
    created.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.title} (${notif.type}) - ${notif.isRead ? 'Đã đọc' : 'Chưa đọc'}`);
    });

    // Đếm số notifications chưa đọc
    const unreadCount = await Notification.countDocuments({
      user: user._id,
      isRead: false
    });
    console.log(`\n📊 Tổng số notifications chưa đọc: ${unreadCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createTestNotifications();




















