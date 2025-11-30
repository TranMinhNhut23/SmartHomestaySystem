/**
 * Script để test việc chuyển tiền vào ví host cho booking đã thanh toán
 * 
 * Usage: node test-host-payment.js <bookingId>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bookingService = require('./src/services/bookingService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homestay';

async function testHostPayment(bookingId) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n💰 Processing host payment for booking:', bookingId);
    const result = await bookingService.processHostPayment(bookingId);
    
    console.log('\n✅ SUCCESS!');
    console.log('Wallet updated:', {
      walletId: result.wallet._id,
      newBalance: result.wallet.balance,
      hostId: result.wallet.user
    });
    console.log('\nTransaction created:', {
      transactionId: result.transaction._id,
      amount: result.transaction.amount,
      type: result.transaction.type,
      status: result.transaction.status
    });
    
    console.log('\n✅ Host payment processed successfully!');
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Get bookingId from command line argument
const bookingId = process.argv[2];

if (!bookingId) {
  console.error('❌ Please provide booking ID as argument');
  console.log('Usage: node test-host-payment.js <bookingId>');
  process.exit(1);
}

testHostPayment(bookingId);







