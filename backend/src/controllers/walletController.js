const walletService = require('../services/walletService');
const paymentService = require('../services/paymentService');

class WalletController {
  // Lấy thông tin ví
  async getWallet(req, res) {
    try {
      const userId = req.userId;

      const wallet = await walletService.getWallet(userId);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin ví thành công',
        data: wallet
      });
    } catch (error) {
      console.error('Error getting wallet:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin ví'
      });
    }
  }

  // Tạo URL thanh toán để nạp tiền vào ví qua MoMo
  async createDepositMoMo(req, res) {
    try {
      const userId = req.userId;
      const { amount } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền phải là số dương hợp lệ'
        });
      }

      // Số tiền tối thiểu và tối đa
      if (amount < 10000) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền nạp tối thiểu là 10,000 VND'
        });
      }

      if (amount > 50000000) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền nạp tối đa là 50,000,000 VND'
        });
      }

      // Lấy thông tin ví
      const wallet = await walletService.getWallet(userId);

      // Tạo metadata để lưu vào extraData
      const metadata = {
        userId: userId.toString(),
        walletId: wallet._id.toString(),
        type: 'deposit',
        timestamp: Date.now()
      };

      // Base URL cho redirect và IPN
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      
      // Cảnh báo nếu dùng localhost cho IPN (MoMo sẽ không thể callback)
      if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
        console.warn('⚠️ CẢNH BÁO: BACKEND_URL đang dùng localhost!');
        console.warn('⚠️ MoMo sẽ KHÔNG THỂ gọi IPN callback đến localhost.');
        console.warn('⚠️ Vui lòng set BACKEND_URL trong .env thành URL công khai (ngrok).');
      }

      // Tạo payment URL
      const paymentResult = await paymentService.createPayment({
        amount: amount,
        orderInfo: `Nạp tiền vào ví - Số tiền: ${new Intl.NumberFormat('vi-VN').format(amount)} VND`,
        redirectUrl: `${backendUrl}/api/wallet/deposit/momo/redirect`,
        ipnUrl: `${backendUrl}/api/wallet/deposit/momo/callback`,
        extraData: JSON.stringify(metadata)
      });

      res.status(200).json({
        success: true,
        message: 'Tạo URL thanh toán thành công',
        data: paymentResult
      });
    } catch (error) {
      console.error('Error creating MoMo deposit:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo URL thanh toán'
      });
    }
  }

  // Redirect từ MoMo sau khi user hoàn tất thanh toán (để quay về app)
  async momoDepositRedirect(req, res) {
    try {
      console.log('========== MoMo Deposit Redirect ==========');
      console.log('Query params:', JSON.stringify(req.query, null, 2));

      const { resultCode, message, amount } = req.query;
      
      // Redirect về app với kết quả
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      
      // So sánh string vì resultCode từ query params là string
      if (resultCode === '0') {
        // Thành công - redirect về result screen với đầy đủ thông tin
        console.log('✅ Payment successful, redirecting to app...');
        return res.redirect(`${frontendUrl}/wallet-deposit-result?success=true&amount=${amount}&method=momo`);
      } else {
        // Thất bại
        console.log('❌ Payment failed, redirecting to app...');
        return res.redirect(`${frontendUrl}/wallet-deposit-result?success=false&message=${encodeURIComponent(message || 'Thanh toán thất bại')}`);
      }
    } catch (error) {
      console.error('Error processing MoMo redirect:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      return res.redirect(`${frontendUrl}/wallet-deposit-result?success=false&message=${encodeURIComponent(error.message)}`);
    }
  }

  // Callback từ MoMo sau khi thanh toán (IPN - server to server)
  async momoDepositCallback(req, res) {
    console.log('\n\n========== MoMo Deposit IPN Callback START ==========');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📥 Request received');
    
    try {
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      const {
        orderId,
        requestId,
        amount,
        orderInfo,
        resultCode,
        message,
        signature,
        extraData,
        transId
      } = req.body;

      // Verify signature
      console.log('🔐 Step 1: Verifying signature...');
      console.log('🔐 Signature received:', signature ? signature.substring(0, 20) + '...' : 'NONE');
      
      let isValid = false;
      try {
        isValid = paymentService.verifySignature(req.body, signature);
        console.log('🔐 Signature valid:', isValid);
      } catch (sigError) {
        console.error('🔐 Signature verification error:', sigError.message);
      }

      if (!isValid) {
        console.error('❌❌ SIGNATURE VERIFICATION FAILED ❌❌');
        console.error('This IPN will be IGNORED');
        console.error('Received signature:', signature);
        // Vẫn trả success cho MoMo để không retry
        return res.status(200).json({
          resultCode: 0,
          message: 'Success'
        });
      }
      
      console.log('✅ Step 1 PASSED: Signature verified successfully');

      // Parse extraData để lấy userId và walletId
      console.log('📋 Step 2: Parsing extraData...');
      console.log('📋 Raw extraData:', extraData);
      
      let metadata = {};
      if (extraData) {
        try {
          // Nếu extraData là base64, decode trước
          let extraDataStr = extraData;
          if (!extraData.includes('{')) {
            console.log('📋 ExtraData is base64, decoding...');
            extraDataStr = Buffer.from(extraData, 'base64').toString('utf-8');
            console.log('📋 Decoded:', extraDataStr);
          }
          metadata = JSON.parse(extraDataStr);
          console.log('📋 Parsed metadata:', metadata);
        } catch (error) {
          console.error('❌ Error parsing extraData:', error.message);
        }
      } else {
        console.warn('⚠️ No extraData provided!');
      }

      const userId = metadata.userId;
      const walletId = metadata.walletId;

      console.log('📋 Extracted - userId:', userId, 'walletId:', walletId);

      if (!userId || !walletId) {
        console.error('❌❌ MISSING USER/WALLET ID ❌❌');
        console.error('Cannot process deposit without user/wallet ID');
        return res.status(200).json({ // Đổi từ 400 thành 200
          resultCode: 0,
          message: 'Success'
        });
      }
      
      console.log('✅ Step 2 PASSED: Metadata extracted successfully');

      // Kiểm tra kết quả thanh toán
      // MoMo có thể gửi resultCode là string "0" hoặc number 0
      console.log('🔍 Step 3: Checking resultCode...');
      console.log('🔍 ResultCode type:', typeof resultCode);
      console.log('🔍 ResultCode value:', resultCode);
      console.log('🔍 Comparison (resultCode == 0):', resultCode == 0);
      console.log('🔍 Comparison (resultCode === 0):', resultCode === 0);
      console.log('🔍 Comparison (resultCode == "0"):', resultCode == "0");
      
      if (resultCode == 0) { // Dùng == để so sánh cả string và number
        console.log('✅ Step 3 PASSED: ResultCode = 0 (success)');
        console.log('💰 Payment successful, processing deposit...');
        console.log('💰 Amount to deposit:', parseInt(amount));
        console.log('💰 User ID:', userId);
        
        // Thanh toán thành công, nạp tiền vào ví
        try {
          const depositResult = await walletService.deposit(userId, parseInt(amount), {
            status: 'completed',
            paymentMethod: 'momo',
            txnRef: transId,
            response: req.body,
            description: orderInfo || 'Nạp tiền vào ví qua MoMo',
            metadata: metadata
          });

          console.log('✅✅✅ DEPOSIT SUCCESSFUL ✅✅✅');
          console.log('New balance:', depositResult.wallet.balance);
          console.log('Transaction ID:', depositResult.transaction._id);

          return res.status(200).json({
            resultCode: 0,
            message: 'Success'
          });
        } catch (depositError) {
          console.error('❌❌❌ DEPOSIT FAILED ❌❌❌');
          console.error('Deposit error:', depositError.message);
          console.error('Deposit error stack:', depositError.stack);
          
          // Vẫn trả success cho MoMo
          return res.status(200).json({
            resultCode: 0,
            message: 'Success'
          });
        }
      } else {
        // Thanh toán thất bại - CHỈ ghi log, KHÔNG nạp tiền
        console.log('❌ Step 3 FAILED: ResultCode != 0');
        console.error('❌ Payment failed:', message, 'Result code:', resultCode);

        // Lưu transaction với status failed (KHÔNG thay đổi balance)
        const Transaction = require('../models/Transaction');
        const wallet = await require('../models/Wallet').findOne({ user: userId });
        
        if (wallet) {
          const failedTransaction = new Transaction({
            wallet: wallet._id,
            user: userId,
            type: 'deposit',
            amount: parseInt(amount),
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance, // Không thay đổi
            status: 'failed',
            paymentMethod: 'momo',
            paymentGatewayTxnRef: transId,
            paymentGatewayResponse: req.body,
            description: `Nạp tiền thất bại qua MoMo: ${message}`,
            metadata: metadata
          });
          await failedTransaction.save();
        }

        return res.status(200).json({
          resultCode: 0,
          message: 'Success' // Vẫn trả về success cho MoMo
        });
      }
    } catch (error) {
      console.error('========== ERROR IN MOMO IPN CALLBACK ==========');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      console.error('================================================');
      
      // Vẫn trả success cho MoMo để không retry liên tục
      return res.status(200).json({
        resultCode: 0,
        message: 'Success'
      });
    }
  }

  // Tạo URL thanh toán để nạp tiền vào ví qua VNPay
  async createDepositVNPay(req, res) {
    try {
      const userId = req.userId;
      const { amount } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền phải là số dương hợp lệ'
        });
      }

      // Số tiền tối thiểu và tối đa
      if (amount < 10000) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền nạp tối thiểu là 10,000 VND'
        });
      }

      if (amount > 50000000) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền nạp tối đa là 50,000,000 VND'
        });
      }

      // Lấy thông tin ví
      const wallet = await walletService.getWallet(userId);

      // Lấy IP address
      let ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   req.connection.socket?.remoteAddress ||
                   '127.0.0.1';

      // Lấy IP đầu tiên nếu có nhiều IP
      if (ipAddr.includes(',')) {
        ipAddr = ipAddr.split(',')[0].trim();
      }

      // Convert IPv6-mapped IPv4 về IPv4
      if (ipAddr.startsWith('::ffff:')) {
        ipAddr = ipAddr.replace('::ffff:', '');
      }

      // Nếu vẫn là IPv6, dùng IP mặc định
      if (ipAddr.includes(':')) {
        console.warn('⚠️ IPv6 address detected, using default IP:', ipAddr);
        ipAddr = '127.0.0.1';
      }

      // Base URL cho redirect
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

      // Tạo bookingId giả (VNPay yêu cầu bookingId)
      // Format: wallet_{walletId}_{timestamp}
      const bookingId = `wallet_${wallet._id.toString().slice(-8)}_${Date.now()}`;

      // Tạo payment URL
      const paymentResult = paymentService.createVNPayPaymentUrl({
        bookingId: bookingId,
        amount: amount,
        orderInfo: `Nạp tiền vào ví - Số tiền: ${new Intl.NumberFormat('vi-VN').format(amount)} VND`,
        returnUrl: `${backendUrl}/api/wallet/deposit/vnpay/callback`,
        ipAddr: ipAddr
      });

      // Lưu mapping bookingId -> userId, walletId để xử lý callback
      // (Có thể dùng Redis hoặc MongoDB để lưu tạm)
      // Ở đây ta lưu vào metadata của transaction pending
      const Transaction = require('../models/Transaction');
      const tempTransaction = new Transaction({
        wallet: wallet._id,
        user: userId,
        type: 'deposit',
        amount: amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // Chưa cập nhật
        status: 'pending',
        paymentMethod: 'vnpay',
        paymentGatewayTxnRef: paymentResult.txnRef,
        description: 'Đang chờ nạp tiền vào ví qua VNPay',
        metadata: {
          bookingId: bookingId,
          txnRef: paymentResult.txnRef
        }
      });
      await tempTransaction.save();

      res.status(200).json({
        success: true,
        message: 'Tạo URL thanh toán thành công',
        data: paymentResult
      });
    } catch (error) {
      console.error('Error creating VNPay deposit:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo URL thanh toán'
      });
    }
  }

  // Callback từ VNPay sau khi thanh toán
  async vnpayDepositCallback(req, res) {
    try {
      console.log('========== VNPay Deposit Callback ==========');
      console.log('Query params:', JSON.stringify(req.query, null, 2));

      const vnpayData = req.query;

      // Verify signature
      const verifyResult = paymentService.verifyVNPayPayment(vnpayData);

      if (!verifyResult.verified) {
        console.error('Invalid signature from VNPay');
        // Redirect về frontend với error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/wallet/deposit/result?success=false&message=Chữ+ký+không+hợp+lệ`);
      }

      const { response_code, txn_ref, amount } = verifyResult;

      // Tìm transaction pending với txnRef này
      const Transaction = require('../models/Transaction');
      const tempTransaction = await Transaction.findOne({
        paymentGatewayTxnRef: txn_ref,
        status: 'pending'
      });

      if (!tempTransaction) {
        console.error('Transaction not found for txnRef:', txn_ref);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/wallet/deposit/result?success=false&message=Không+tìm+thấy+giao+dịch`);
      }

      const userId = tempTransaction.user;
      const walletId = tempTransaction.wallet;

      // Kiểm tra kết quả thanh toán
      if (response_code === '00') {
        // Thanh toán thành công
        
        // Xóa transaction tạm
        await Transaction.deleteOne({ _id: tempTransaction._id });

        // Nạp tiền vào ví
        const depositResult = await walletService.deposit(userId, amount, {
          status: 'completed',
          paymentMethod: 'vnpay',
          txnRef: txn_ref,
          response: vnpayData,
          description: 'Nạp tiền vào ví qua VNPay',
          metadata: {
            txnRef: txn_ref,
            responseCode: response_code
          }
        });

        console.log('Deposit successful:', depositResult);

        // Redirect về frontend với success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/wallet/deposit/result?success=true&amount=${amount}&method=vnpay`);
      } else {
        // Thanh toán thất bại
        console.error('Payment failed. Response code:', response_code);

        // Cập nhật transaction tạm thành failed
        tempTransaction.status = 'failed';
        tempTransaction.paymentGatewayResponse = vnpayData;
        tempTransaction.description = `Nạp tiền thất bại qua VNPay. Mã lỗi: ${response_code}`;
        await tempTransaction.save();

        // Redirect về frontend với error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/wallet/deposit/result?success=false&message=Thanh+toán+thất+bại&code=${response_code}`);
      }
    } catch (error) {
      console.error('Error processing VNPay deposit callback:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/wallet/deposit/result?success=false&message=Lỗi+xử+lý+callback`);
    }
  }

  // Lấy lịch sử giao dịch
  async getTransactions(req, res) {
    try {
      const userId = req.userId;
      const {
        page = 1,
        limit = 20,
        type,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await walletService.getTransactions(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status,
        sortBy,
        sortOrder
      });

      res.status(200).json({
        success: true,
        message: 'Lấy lịch sử giao dịch thành công',
        data: result
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy lịch sử giao dịch'
      });
    }
  }

  // Lấy chi tiết giao dịch
  async getTransaction(req, res) {
    try {
      const userId = req.userId;
      const { transactionId } = req.params;

      const transaction = await walletService.getTransaction(userId, transactionId);

      res.status(200).json({
        success: true,
        message: 'Lấy chi tiết giao dịch thành công',
        data: transaction
      });
    } catch (error) {
      console.error('Error getting transaction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy chi tiết giao dịch'
      });
    }
  }

  // Rút tiền (Admin hoặc Host)
  async withdraw(req, res) {
    try {
      const userId = req.userId;
      const { amount, bankInfo, note } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền phải là số dương hợp lệ'
        });
      }

      // Số tiền tối thiểu
      if (amount < 50000) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền rút tối thiểu là 50,000 VND'
        });
      }

      // Validate bankInfo
      if (!bankInfo || !bankInfo.bankName || !bankInfo.accountNumber || !bankInfo.accountName) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin ngân hàng'
        });
      }

      const result = await walletService.withdraw(userId, amount, {
        status: 'pending',
        paymentMethod: 'bank_transfer',
        description: 'Yêu cầu rút tiền từ ví',
        note: note || null,
        metadata: {
          bankInfo: bankInfo
        }
      });

      res.status(200).json({
        success: true,
        message: 'Yêu cầu rút tiền đã được tạo. Vui lòng đợi xử lý.',
        data: result
      });
    } catch (error) {
      console.error('Error withdrawing:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo yêu cầu rút tiền'
      });
    }
  }

  // [ADMIN] Thống kê ví
  async getWalletStats(req, res) {
    try {
      const stats = await walletService.getWalletStats();

      res.status(200).json({
        success: true,
        message: 'Lấy thống kê ví thành công',
        data: stats
      });
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thống kê ví'
      });
    }
  }

  // [ADMIN] Khóa ví
  async lockWallet(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const wallet = await walletService.lockWallet(userId, reason);

      res.status(200).json({
        success: true,
        message: 'Khóa ví thành công',
        data: wallet
      });
    } catch (error) {
      console.error('Error locking wallet:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi khóa ví'
      });
    }
  }

  // [ADMIN] Mở khóa ví
  async unlockWallet(req, res) {
    try {
      const { userId } = req.params;

      const wallet = await walletService.unlockWallet(userId);

      res.status(200).json({
        success: true,
        message: 'Mở khóa ví thành công',
        data: wallet
      });
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi mở khóa ví'
      });
    }
  }
}

module.exports = new WalletController();

