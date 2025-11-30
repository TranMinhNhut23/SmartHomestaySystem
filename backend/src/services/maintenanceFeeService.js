const User = require('../models/User');
const Wallet = require('../models/Wallet');
const walletService = require('./walletService');
const notificationService = require('./notificationService');

class MaintenanceFeeService {
  // Phí duy trì hàng tháng (75,000 VND)
  static MAINTENANCE_FEE_AMOUNT = 75000;

  /**
   * Xử lý trừ phí duy trì hàng tháng cho tất cả host
   * Chạy vào ngày 2 hàng tháng
   */
  async processMonthlyMaintenanceFee() {
    console.log('\n========== BẮT ĐẦU XỬ LÝ PHÍ DUY TRÌ HÀNG THÁNG ==========');
    console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);
    
    try {
      // Lấy tất cả host có ví
      const hosts = await User.find({ 
        roleName: 'host',
        isActive: true 
      }).select('_id username email');

      if (!hosts || hosts.length === 0) {
        console.log('Không có host nào để xử lý phí duy trì');
        return {
          success: true,
          totalHosts: 0,
          successful: 0,
          failed: 0,
          insufficientBalance: 0
        };
      }

      console.log(`Tìm thấy ${hosts.length} host cần xử lý phí duy trì`);

      const results = {
        totalHosts: hosts.length,
        successful: 0,
        failed: 0,
        insufficientBalance: 0,
        details: []
      };

      // Lấy tất cả admin để gửi notification
      const admins = await User.find({ roleName: 'admin' }).select('_id');

      // Xử lý từng host
      for (const host of hosts) {
        try {
          // Kiểm tra host có ví không
          const wallet = await Wallet.findOne({ user: host._id });
          if (!wallet) {
            console.log(`Host ${host.username} (${host._id}) chưa có ví, bỏ qua`);
            results.failed++;
            results.details.push({
              hostId: host._id,
              hostName: host.username,
              status: 'skipped',
              reason: 'Chưa có ví'
            });
            continue;
          }

          // Trừ phí duy trì
          const result = await walletService.chargeMaintenanceFee(
            host._id, 
            MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT
          );

          if (result.success) {
            // Thành công - gửi notification cho host
            await notificationService.createNotification(
              host._id,
              'maintenance_fee_charged',
              'Phí duy trì hàng tháng',
              `Phí duy trì hàng tháng ${MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT.toLocaleString('vi-VN')} VND đã được trừ từ ví của bạn. Số dư hiện tại: ${result.wallet.balance.toLocaleString('vi-VN')} VND`,
              {
                amount: MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT,
                balanceAfter: result.wallet.balance,
                transactionId: result.transaction._id.toString(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
              }
            );

            results.successful++;
            results.details.push({
              hostId: host._id,
              hostName: host.username,
              status: 'success',
              amount: MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT,
              balanceAfter: result.wallet.balance
            });

            console.log(`✅ Host ${host.username}: Trừ phí thành công`);
          } else if (result.insufficientBalance) {
            // Không đủ số dư - gửi notification cho host và admin
            const missingAmount = MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT - result.actualDeducted;
            
            // Notification cho host
            await notificationService.createNotification(
              host._id,
              'maintenance_fee_failed',
              '⚠️ Phí duy trì - Số dư không đủ',
              `Phí duy trì hàng tháng ${MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT.toLocaleString('vi-VN')} VND không thể trừ đầy đủ do số dư không đủ. Đã trừ ${result.actualDeducted.toLocaleString('vi-VN')} VND, còn thiếu ${missingAmount.toLocaleString('vi-VN')} VND. Vui lòng nạp thêm tiền vào ví.`,
              {
                requestedAmount: MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT,
                actualDeducted: result.actualDeducted,
                missingAmount: missingAmount,
                balanceAfter: result.wallet.balance,
                transactionId: result.transaction._id.toString(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
              }
            );

            // Notification cho tất cả admin
            for (const admin of admins) {
              await notificationService.createNotification(
                admin._id,
                'maintenance_fee_failed',
                '⚠️ Phí duy trì thất bại - Host không đủ số dư',
                `Host ${host.username} (${host.email}) không đủ số dư để trừ phí duy trì hàng tháng. Đã trừ ${result.actualDeducted.toLocaleString('vi-VN')} VND, còn thiếu ${missingAmount.toLocaleString('vi-VN')} VND.`,
                {
                  hostId: host._id.toString(),
                  hostName: host.username,
                  hostEmail: host.email,
                  requestedAmount: MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT,
                  actualDeducted: result.actualDeducted,
                  missingAmount: missingAmount,
                  balanceAfter: result.wallet.balance,
                  transactionId: result.transaction._id.toString(),
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear()
                }
              );
            }

            results.insufficientBalance++;
            results.details.push({
              hostId: host._id,
              hostName: host.username,
              status: 'insufficient_balance',
              requestedAmount: MaintenanceFeeService.MAINTENANCE_FEE_AMOUNT,
              actualDeducted: result.actualDeducted,
              missingAmount: missingAmount,
              balanceAfter: result.wallet.balance
            });

            console.log(`⚠️ Host ${host.username}: Số dư không đủ (thiếu ${missingAmount.toLocaleString('vi-VN')} VND)`);
          } else {
            // Lỗi khác
            results.failed++;
            results.details.push({
              hostId: host._id,
              hostName: host.username,
              status: 'failed',
              reason: 'Lỗi không xác định'
            });

            console.log(`❌ Host ${host.username}: Lỗi khi trừ phí`);
          }
        } catch (error) {
          console.error(`❌ Lỗi khi xử lý host ${host.username}:`, error.message);
          results.failed++;
          results.details.push({
            hostId: host._id,
            hostName: host.username,
            status: 'error',
            error: error.message
          });
        }
      }

      // Gửi notification tổng kết cho admin
      const summaryMessage = `Đã xử lý phí duy trì hàng tháng cho ${results.totalHosts} host:\n` +
        `✅ Thành công: ${results.successful}\n` +
        `⚠️ Không đủ số dư: ${results.insufficientBalance}\n` +
        `❌ Thất bại: ${results.failed}`;

      for (const admin of admins) {
        await notificationService.createNotification(
          admin._id,
          'system_announcement',
          '📊 Tổng kết phí duy trì hàng tháng',
          summaryMessage,
          {
            ...results,
            processedAt: new Date(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          }
        );
      }

      console.log('\n========== KẾT QUẢ XỬ LÝ PHÍ DUY TRÌ ==========');
      console.log(`Tổng số host: ${results.totalHosts}`);
      console.log(`✅ Thành công: ${results.successful}`);
      console.log(`⚠️ Không đủ số dư: ${results.insufficientBalance}`);
      console.log(`❌ Thất bại: ${results.failed}`);
      console.log('================================================\n');

      return results;
    } catch (error) {
      console.error('❌ Lỗi khi xử lý phí duy trì hàng tháng:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra xem đã xử lý phí duy trì trong tháng này chưa
   * (Để tránh trùng lặp nếu cron job chạy nhiều lần)
   */
  async hasProcessedThisMonth() {
    const Transaction = require('../models/Transaction');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const count = await Transaction.countDocuments({
      type: 'maintenance_fee',
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      },
      status: 'completed'
    });

    return count > 0;
  }
}

module.exports = new MaintenanceFeeService();


