const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');

class WalletService {
  // Tạo ví mới cho user
  async createWallet(userId) {
    try {
      // Kiểm tra user có tồn tại không
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User không tồn tại');
      }

      // Kiểm tra user đã có ví chưa
      const existingWallet = await Wallet.findOne({ user: userId });
      if (existingWallet) {
        return existingWallet;
      }

      // Tạo ví mới
      const wallet = new Wallet({
        user: userId,
        balance: 0,
        status: 'active'
      });

      await wallet.save();

      // Cập nhật user với wallet ID
      user.wallet = wallet._id;
      await user.save();

      console.log('Wallet created successfully for user:', userId);

      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }

  // Lấy thông tin ví của user
  async getWallet(userId) {
    try {
      let wallet = await Wallet.findOne({ user: userId }).populate('user', '-password');
      
      // Nếu chưa có ví, tự động tạo
      if (!wallet) {
        wallet = await this.createWallet(userId);
        wallet = await Wallet.findById(wallet._id).populate('user', '-password');
      }

      return wallet;
    } catch (error) {
      console.error('Error getting wallet:', error);
      throw error;
    }
  }

  // Nạp tiền vào ví
  async deposit(userId, amount, paymentData = {}) {
    // MongoDB transactions chỉ hoạt động trên Replica Set hoặc Atlas
    // Trong dev mode với standalone MongoDB, bỏ qua transactions
    const useTransactions = process.env.USE_MONGO_TRANSACTIONS === 'true';
    
    let session = null;
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền phải là số dương hợp lệ');
      }

      // Lấy ví của user
      const findOptions = session ? { session } : {};
      const wallet = await Wallet.findOne({ user: userId }).session(session);
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      // Kiểm tra trạng thái ví
      if (wallet.status !== 'active') {
        throw new Error('Ví đang bị khóa hoặc tạm ngưng');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // Cập nhật số dư ví
      wallet.balance = balanceAfter;
      wallet.totalDeposited += amount;
      const saveOptions = session ? { session } : {};
      await wallet.save(saveOptions);

      // Tạo transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'deposit',
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: paymentData.status || 'completed',
        paymentMethod: paymentData.paymentMethod || null,
        paymentGatewayTxnRef: paymentData.txnRef || null,
        paymentGatewayResponse: paymentData.response || null,
        description: paymentData.description || `Nạp tiền vào ví qua ${paymentData.paymentMethod || 'hệ thống'}`,
        note: paymentData.note || null,
        metadata: paymentData.metadata || {},
        completedAt: paymentData.status === 'completed' ? new Date() : null
      });

      await transaction.save(saveOptions);

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`Deposit successful: User ${userId}, Amount: ${amount}, New Balance: ${balanceAfter}`);

      return {
        wallet,
        transaction
      };
    } catch (error) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error depositing to wallet:', error);
      throw error;
    }
  }

  // Rút tiền từ ví
  async withdraw(userId, amount, withdrawData = {}) {
    const useTransactions = process.env.USE_MONGO_TRANSACTIONS === 'true';
    
    let session = null;
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền phải là số dương hợp lệ');
      }

      // Lấy ví của user
      const findOptions = useTransactions && session ? { session } : {};
      const wallet = await Wallet.findOne({ user: userId }, null, findOptions);
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      // Kiểm tra trạng thái ví
      if (wallet.status !== 'active') {
        throw new Error('Ví đang bị khóa hoặc tạm ngưng');
      }

      // Kiểm tra số dư
      if (!wallet.hasSufficientBalance(amount)) {
        throw new Error(`Số dư không đủ. Số dư hiện tại: ${wallet.formatBalance()}`);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      // Cập nhật số dư ví
      wallet.balance = balanceAfter;
      wallet.totalWithdrawn += amount;
      const saveOptions = useTransactions && session ? { session } : {};
      await wallet.save(saveOptions);

      // Tạo transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'withdraw',
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: withdrawData.status || 'pending',
        paymentMethod: withdrawData.paymentMethod || 'bank_transfer',
        description: withdrawData.description || 'Rút tiền từ ví',
        note: withdrawData.note || null,
        metadata: withdrawData.metadata || {},
        completedAt: withdrawData.status === 'completed' ? new Date() : null
      });

      await transaction.save(saveOptions);

      if (useTransactions && session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`Withdraw successful: User ${userId}, Amount: ${amount}, New Balance: ${balanceAfter}`);

      return {
        wallet,
        transaction
      };
    } catch (error) {
      if (useTransactions && session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error withdrawing from wallet:', error);
      throw error;
    }
  }

  // Thanh toán bằng ví
  async payment(userId, amount, paymentData = {}) {
    const useTransactions = process.env.USE_MONGO_TRANSACTIONS === 'true';
    
    let session = null;
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền phải là số dương hợp lệ');
      }

      // Lấy ví của user
      const findOptions = useTransactions && session ? { session } : {};
      const wallet = await Wallet.findOne({ user: userId }, null, findOptions);
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      // Kiểm tra trạng thái ví
      if (wallet.status !== 'active') {
        throw new Error('Ví đang bị khóa hoặc tạm ngưng');
      }

      // Kiểm tra số dư
      if (!wallet.hasSufficientBalance(amount)) {
        throw new Error(`Số dư không đủ. Số dư hiện tại: ${wallet.formatBalance()}`);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      // Cập nhật số dư ví
      wallet.balance = balanceAfter;
      wallet.totalSpent += amount;
      const saveOptions = useTransactions && session ? { session } : {};
      await wallet.save(saveOptions);

      // Tạo transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'payment',
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: 'completed',
        paymentMethod: 'wallet',
        booking: paymentData.bookingId || null,
        description: paymentData.description || 'Thanh toán đơn hàng bằng ví',
        note: paymentData.note || null,
        metadata: paymentData.metadata || {},
        completedAt: new Date()
      });

      await transaction.save(saveOptions);

      if (useTransactions && session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`Payment successful: User ${userId}, Amount: ${amount}, New Balance: ${balanceAfter}`);

      return {
        wallet,
        transaction
      };
    } catch (error) {
      if (useTransactions && session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Hoàn tiền vào ví
  async refund(userId, amount, refundData = {}) {
    const useTransactions = process.env.USE_MONGO_TRANSACTIONS === 'true';
    
    let session = null;
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền phải là số dương hợp lệ');
      }

      // Lấy ví của user
      const findOptions = useTransactions && session ? { session } : {};
      const wallet = await Wallet.findOne({ user: userId }, null, findOptions);
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // Cập nhật số dư ví
      wallet.balance = balanceAfter;
      const saveOptions = useTransactions && session ? { session } : {};
      await wallet.save(saveOptions);

      // Tạo transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'refund',
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: 'completed',
        paymentMethod: 'wallet',
        booking: refundData.bookingId || null,
        description: refundData.description || 'Hoàn tiền vào ví',
        note: refundData.note || null,
        metadata: refundData.metadata || {},
        completedAt: new Date()
      });

      await transaction.save(saveOptions);

      if (useTransactions && session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`Refund successful: User ${userId}, Amount: ${amount}, New Balance: ${balanceAfter}`);

      return {
        wallet,
        transaction
      };
    } catch (error) {
      if (useTransactions && session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Host nhận tiền từ booking vào ví
  async receiveBookingPayment(hostId, amount, bookingData = {}) {
    // MongoDB transactions chỉ hoạt động trên Replica Set hoặc Atlas
    const useTransactions = process.env.USE_MONGO_TRANSACTIONS === 'true';
    
    let session = null;
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền phải là số dương hợp lệ');
      }

      // Lấy ví của host
      const findOptions = useTransactions && session ? { session } : {};
      const wallet = await Wallet.findOne({ user: hostId }, null, findOptions);
      if (!wallet) {
        // Nếu host chưa có ví, tự động tạo
        console.log(`Host ${hostId} chưa có ví, đang tạo...`);
        await this.createWallet(hostId);
        const newWallet = await Wallet.findOne({ user: hostId }, null, findOptions);
        if (!newWallet) {
          throw new Error('Không thể tạo ví cho host');
        }
        return await this.receiveBookingPayment(hostId, amount, bookingData);
      }

      // Kiểm tra trạng thái ví
      if (wallet.status !== 'active') {
        throw new Error('Ví của host đang bị khóa hoặc tạm ngưng');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // Cập nhật số dư ví
      wallet.balance = balanceAfter;
      const saveOptions = useTransactions && session ? { session } : {};
      await wallet.save(saveOptions);

      // Tạo transaction record
      const transaction = new Transaction({
        wallet: wallet._id,
        user: hostId,
        type: 'deposit',
        amount: amount,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: 'completed',
        paymentMethod: bookingData.paymentMethod || 'booking',
        booking: bookingData.bookingId || null,
        description: bookingData.description || 'Nhận tiền từ đơn đặt phòng',
        note: bookingData.note || null,
        metadata: {
          ...bookingData.metadata,
          source: 'booking_payment',
          guestId: bookingData.guestId || null,
          homestayId: bookingData.homestayId || null
        },
        completedAt: new Date()
      });

      await transaction.save(saveOptions);

      if (useTransactions && session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`✅ Booking payment received by host: Host ${hostId}, Amount: ${amount}, New Balance: ${balanceAfter}`);

      return {
        wallet,
        transaction
      };
    } catch (error) {
      if (useTransactions && session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error processing host booking payment:', error);
      throw error;
    }
  }

  // Lấy lịch sử giao dịch
  async getTransactions(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        status = null,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Lấy ví của user
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      // Build query
      const query = { wallet: wallet._id };
      if (type) query.type = type;
      if (status) query.status = status;

      // Count total
      const total = await Transaction.countDocuments(query);

      // Get transactions
      const transactions = await Transaction.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('booking', 'bookingCode checkInDate checkOutDate totalPrice');

      return {
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  // Lấy chi tiết giao dịch
  async getTransaction(userId, transactionId) {
    try {
      // Lấy ví của user
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      const transaction = await Transaction.findOne({
        _id: transactionId,
        wallet: wallet._id
      }).populate('booking', 'bookingCode checkInDate checkOutDate totalPrice');

      if (!transaction) {
        throw new Error('Giao dịch không tồn tại');
      }

      return transaction;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  // Khóa ví
  async lockWallet(userId, reason = '') {
    try {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      wallet.status = 'locked';
      await wallet.save();

      console.log(`Wallet locked for user ${userId}. Reason: ${reason}`);

      return wallet;
    } catch (error) {
      console.error('Error locking wallet:', error);
      throw error;
    }
  }

  // Mở khóa ví
  async unlockWallet(userId) {
    try {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error('Ví không tồn tại');
      }

      wallet.status = 'active';
      await wallet.save();

      console.log(`Wallet unlocked for user ${userId}`);

      return wallet;
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      throw error;
    }
  }

  // Trừ phí duy trì hàng tháng cho host
  async chargeMaintenanceFee(hostId, amount = 75000) {
    const useTransactions = process.env.USE_MONGO_TRANSACTIONS === 'true';
    
    let session = null;
    if (useTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        throw new Error('Số tiền phí duy trì phải là số dương hợp lệ');
      }

      const findOptions = useTransactions && session ? { session } : {};
      const saveOptions = useTransactions && session ? { session } : {};

      // Lấy ví của host
      const wallet = await Wallet.findOne({ user: hostId }, null, findOptions);
      if (!wallet) {
        throw new Error('Host chưa có ví');
      }

      // Kiểm tra trạng thái ví
      if (wallet.status !== 'active') {
        throw new Error('Ví của host đang bị khóa hoặc tạm ngưng');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = Math.max(0, balanceBefore - amount); // Không cho phép số dư âm
      const actualDeducted = balanceBefore - balanceAfter; // Số tiền thực tế đã trừ

      // Cập nhật số dư ví host
      wallet.balance = balanceAfter;
      wallet.totalWithdrawn += actualDeducted;
      await wallet.save(saveOptions);

      // Tạo transaction record cho host
      const transaction = new Transaction({
        wallet: wallet._id,
        user: hostId,
        type: 'maintenance_fee',
        amount: actualDeducted,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        status: actualDeducted === amount ? 'completed' : 'failed', // Nếu không đủ tiền thì failed
        paymentMethod: 'system',
        description: `Phí duy trì hàng tháng - ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`,
        note: actualDeducted < amount 
          ? `Số dư không đủ. Đã trừ ${actualDeducted.toLocaleString('vi-VN')} VND (thiếu ${(amount - actualDeducted).toLocaleString('vi-VN')} VND)` 
          : `Phí duy trì hàng tháng ${amount.toLocaleString('vi-VN')} VND đã được trừ tự động`,
        metadata: {
          maintenanceFee: amount,
          actualDeducted: actualDeducted,
          isPartial: actualDeducted < amount,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          chargedAt: new Date()
        },
        completedAt: actualDeducted === amount ? new Date() : null
      });

      await transaction.save(saveOptions);

      // Chuyển tiền vào ví admin (chỉ khi trừ thành công)
      if (actualDeducted > 0) {
        // Tìm admin user
        const adminUsers = await User.find({ roleName: 'admin' }).select('_id').limit(1);
        if (adminUsers.length > 0) {
          const adminId = adminUsers[0]._id;
          
          // Tìm hoặc tạo ví admin
          let adminWallet = await Wallet.findOne({ user: adminId }, null, findOptions);
          if (!adminWallet) {
            adminWallet = await this.createWallet(adminId);
            // Nếu dùng transaction, cần populate lại
            if (useTransactions && session) {
              adminWallet = await Wallet.findById(adminWallet._id, null, findOptions);
            }
          }

          // Kiểm tra trạng thái ví admin
          if (adminWallet.status === 'active') {
            const adminBalanceBefore = adminWallet.balance;
            const adminBalanceAfter = adminBalanceBefore + actualDeducted;

            // Cập nhật số dư ví admin
            adminWallet.balance = adminBalanceAfter;
            adminWallet.totalDeposited += actualDeducted;
            await adminWallet.save(saveOptions);

            // Tạo transaction record cho admin
            const adminTransaction = new Transaction({
              wallet: adminWallet._id,
              user: adminId,
              type: 'maintenance_fee',
              amount: actualDeducted,
              balanceBefore: adminBalanceBefore,
              balanceAfter: adminBalanceAfter,
              status: 'completed',
              paymentMethod: 'system',
              description: `Thu phí duy trì hàng tháng từ host - ${new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`,
              note: `Nhận phí duy trì hàng tháng ${actualDeducted.toLocaleString('vi-VN')} VND từ host`,
              metadata: {
                maintenanceFee: amount,
                receivedAmount: actualDeducted,
                fromHostId: hostId.toString(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                receivedAt: new Date()
              },
              completedAt: new Date()
            });

            await adminTransaction.save(saveOptions);
            console.log(`Maintenance fee transferred to admin wallet: ${actualDeducted} VND`);
          }
        }
      }

      if (useTransactions && session) {
        await session.commitTransaction();
        session.endSession();
      }

      console.log(`Maintenance fee charged: Host ${hostId}, Amount: ${actualDeducted}, New Balance: ${balanceAfter}`);

      return {
        wallet,
        transaction,
        success: actualDeducted === amount,
        actualDeducted,
        requestedAmount: amount,
        insufficientBalance: actualDeducted < amount
      };
    } catch (error) {
      if (useTransactions && session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error charging maintenance fee:', error);
      throw error;
    }
  }

  // Thống kê ví (cho admin)
  async getWalletStats() {
    try {
      const stats = await Wallet.aggregate([
        {
          $group: {
            _id: null,
            totalWallets: { $sum: 1 },
            totalBalance: { $sum: '$balance' },
            totalDeposited: { $sum: '$totalDeposited' },
            totalWithdrawn: { $sum: '$totalWithdrawn' },
            totalSpent: { $sum: '$totalSpent' },
            activeWallets: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            lockedWallets: {
              $sum: { $cond: [{ $eq: ['$status', 'locked'] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalWallets: 0,
        totalBalance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalSpent: 0,
        activeWallets: 0,
        lockedWallets: 0
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();

