const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Số dư không được âm']
  },
  currency: {
    type: String,
    default: 'VND',
    enum: ['VND']
  },
  status: {
    type: String,
    enum: ['active', 'locked', 'suspended'],
    default: 'active'
  },
  // Để tracking
  totalDeposited: {
    type: Number,
    default: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh
walletSchema.index({ user: 1 });
walletSchema.index({ status: 1 });

// Method để kiểm tra đủ tiền
walletSchema.methods.hasSufficientBalance = function(amount) {
  return this.balance >= amount;
};

// Method để format số tiền
walletSchema.methods.formatBalance = function() {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(this.balance);
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;


