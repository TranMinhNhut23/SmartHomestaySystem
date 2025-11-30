const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'payment', 'refund', 'bonus', 'maintenance_fee'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Số tiền phải lớn hơn 0']
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  // Thông tin thanh toán
  paymentMethod: {
    type: String,
    enum: ['momo', 'vnpay', 'wallet', 'bank_transfer', 'cash'],
    default: null
  },
  paymentGatewayTxnRef: {
    type: String, // Transaction reference từ MoMo/VNPay
    default: null
  },
  paymentGatewayResponse: {
    type: mongoose.Schema.Types.Mixed, // Lưu full response từ gateway
    default: null
  },
  // Liên kết với booking nếu có
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  // Mô tả giao dịch
  description: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: null
  },
  // Metadata bổ sung
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ paymentGatewayTxnRef: 1 });
transactionSchema.index({ booking: 1 });

// Method để format số tiền
transactionSchema.methods.formatAmount = function() {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(this.amount);
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;


