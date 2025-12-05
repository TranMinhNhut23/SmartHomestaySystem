const cron = require('node-cron');
const maintenanceFeeService = require('./maintenanceFeeService');

class ScheduledTasksService {
  /**
   * Setup tất cả scheduled tasks
   */
  setupScheduledTasks() {
    console.log('🔧 Đang khởi tạo scheduled tasks...');

    // Task: Trừ phí duy trì hàng tháng vào ngày 2 mỗi tháng lúc 00:00
    // Cron expression: '0 0 2 * *' = 00:00:00 ngày 2 hàng tháng
    cron.schedule('0 0 2 * *', async () => {
      console.log('\n⏰ Scheduled task triggered: Monthly maintenance fee');
      console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);
      
      try {
        // Kiểm tra xem đã xử lý trong tháng này chưa
        const hasProcessed = await maintenanceFeeService.hasProcessedThisMonth();
        if (hasProcessed) {
          console.log('⚠️ Phí duy trì đã được xử lý trong tháng này, bỏ qua');
          return;
        }

        // Xử lý phí duy trì
        const result = await maintenanceFeeService.processMonthlyMaintenanceFee();
        console.log('✅ Scheduled task completed:', result);
      } catch (error) {
        console.error('❌ Lỗi trong scheduled task (maintenance fee):', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Ho_Chi_Minh'
    });

    console.log('✅ Scheduled task đã được đăng ký: Phí duy trì hàng tháng (ngày 2, 00:00)');

    // Test task (có thể xóa sau khi test xong)
    // Chạy mỗi phút để test (chỉ dùng trong development)
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_TEST_CRON === 'true') {
      console.log('⚠️ Test cron job đã được bật (chạy mỗi phút)');
      cron.schedule('* * * * *', async () => {
        console.log('🧪 Test cron job triggered:', new Date().toLocaleString('vi-VN'));
        // Không chạy thực tế, chỉ log
      });
    }
  }

  /**
   * Chạy thủ công phí duy trì (cho testing hoặc admin trigger)
   */
  async runMaintenanceFeeManually() {
    console.log('🔧 Chạy thủ công phí duy trì hàng tháng...');
    return await maintenanceFeeService.processMonthlyMaintenanceFee();
  }
}

module.exports = new ScheduledTasksService();








