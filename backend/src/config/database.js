const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp', {
      // Các options không còn cần thiết cho mongoose 6+
    });
    
    console.log(`MongoDB đã kết nối: ${conn.connection.host}`);
  } catch (error) {
    console.error('Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;


