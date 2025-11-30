/**
 * Script để tìm các booking đã paid nhưng chưa chuyển tiền cho host
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');
const Homestay = require('./src/models/Homestay');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homestay';

async function findPaidBookings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Tìm bookings đã paid và confirmed
    const bookings = await Booking.find({
      paymentStatus: 'paid',
      status: 'confirmed'
    })
    .populate('homestay', 'name')
    .populate('guest', 'username email')
    .sort({ createdAt: -1 })
    .limit(10);

    console.log(`📋 Found ${bookings.length} paid bookings:\n`);

    bookings.forEach((booking, index) => {
      console.log(`${index + 1}. Booking ID: ${booking._id}`);
      console.log(`   Homestay: ${booking.homestay?.name || 'N/A'}`);
      console.log(`   Guest: ${booking.guest?.username || 'N/A'}`);
      console.log(`   Total: ${booking.totalPrice.toLocaleString('vi-VN')} VND`);
      console.log(`   Payment Status: ${booking.paymentStatus}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Created: ${booking.createdAt}`);
      console.log('');
    });

    if (bookings.length > 0) {
      console.log('\n💡 To process payment for a booking, run:');
      console.log(`   node test-host-payment.js ${bookings[0]._id}`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

findPaidBookings();

