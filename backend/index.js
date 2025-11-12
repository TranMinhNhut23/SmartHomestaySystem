const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/database');

// Load environment variables
dotenv.config();

// Kết nối database
connectDB().then(() => {
  // Khởi tạo roles mặc định sau khi kết nối database
  const { initializeRoles } = require('./src/config/roles');
  initializeRoles();
});

// Khởi tạo app
const app = express();

// Middleware
app.use(cors({
  origin: '*', // Cho phép tất cả origins (trong production nên giới hạn)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Tăng limit để nhận base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/roles', require('./src/routes/roleRoutes'));

// Route test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API đang hoạt động'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  console.error('Error stack:', err.stack);
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    code: err.code
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server',
    error: process.env.NODE_ENV === 'development' ? {
      name: err.name,
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại'
  });
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
});

module.exports = app;

