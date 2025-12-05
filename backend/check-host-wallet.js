/**
 * Script để kiểm tra số dư ví host
 * 
 * Usage: node check-host-wallet.js <hostId>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Wallet = require('./src/models/Wallet');
const Transaction = require('./src/models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homestay';

async function checkHostWallet(hostId) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get wallet
    const wallet = await Wallet.findOne({ user: hostId });
    
    if (!wallet) {
      console.log('❌ Host chưa có ví!');
      return;
    }

    console.log('💰 THÔNG TIN VÍ HOST:');
    console.log('─'.repeat(50));
    console.log(`Wallet ID: ${wallet._id}`);
    console.log(`User ID: ${wallet.user}`);
    console.log(`Số dư hiện tại: ${wallet.balance.toLocaleString('vi-VN')} VNĐ`);
    console.log(`Tổng đã nhận: ${wallet.totalDeposited.toLocaleString('vi-VN')} VNĐ`);
    console.log(`Tổng đã rút: ${wallet.totalWithdrawn.toLocaleString('vi-VN')} VNĐ`);
    console.log(`Status: ${wallet.status}`);
    console.log('─'.repeat(50));

    // Get recent transactions
    const transactions = await Transaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('\n📋 10 GIAO DỊCH GẦN NHẤT:');
    console.log('─'.repeat(50));
    
    transactions.forEach((tx, index) => {
      const sign = tx.type === 'deposit' ? '+' : '-';
      const emoji = tx.type === 'deposit' ? '💵' : '💸';
      console.log(`${index + 1}. ${emoji} ${sign}${tx.amount.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Balance: ${tx.balanceBefore.toLocaleString('vi-VN')} → ${tx.balanceAfter.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Date: ${tx.createdAt.toLocaleString('vi-VN')}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get hostId from command line argument
const hostId = process.argv[2];

if (!hostId) {
  console.error('❌ Please provide host ID as argument');
  console.log('Usage: node check-host-wallet.js <hostId>');
  console.log('Example: node check-host-wallet.js 69135c3358dbfc1844e93667');
  process.exit(1);
}

checkHostWallet(hostId);













