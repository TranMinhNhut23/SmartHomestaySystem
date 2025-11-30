// Script để kiểm tra wallet balance
const mongoose = require('mongoose');
require('dotenv').config();

const Wallet = require('./src/models/Wallet');
const Transaction = require('./src/models/Transaction');

async function checkWallet() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Tìm wallet của user
    const userId = '691350ec58dbfc1844e9364b'; // User từ logs
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      console.log('❌ Wallet not found');
      return;
    }

    console.log('\n💰 Wallet Info:');
    console.log('Balance:', wallet.balance);
    console.log('Total Deposited:', wallet.totalDeposited);
    console.log('Status:', wallet.status);

    // Lấy transactions gần đây
    const transactions = await Transaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log('\n📊 Recent Transactions:');
    transactions.forEach((tx, i) => {
      console.log(`\n${i + 1}. ${tx.type.toUpperCase()}`);
      console.log('   Amount:', tx.amount);
      console.log('   Status:', tx.status);
      console.log('   Method:', tx.paymentMethod);
      console.log('   TxnRef:', tx.paymentGatewayTxnRef);
      console.log('   Created:', tx.createdAt);
      console.log('   Description:', tx.description);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkWallet();


