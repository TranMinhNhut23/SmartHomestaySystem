const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/database');

// Load environment variables
dotenv.config();

// Kết nối database
connectDB().then(() => {
  // Khởi tạo roles mặc định sau khi kết nối database
  const { initializeRoles } = require('./src/config/roles');
  initializeRoles();
  
  // Khởi tạo email service để verify connection
  const emailService = require('./src/services/emailService');
  console.log('Email service đã được khởi tạo');
  
  // Khởi tạo scheduled tasks
  const { setupScheduledTasks } = require('./src/services/scheduledTasksService');
  setupScheduledTasks();
  console.log('Scheduled tasks đã được khởi tạo');
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
  console.log('Query params:', req.query);
  console.log('Route params:', req.params);
  console.log('Request URL:', req.url);
  console.log('Request originalUrl:', req.originalUrl);
  // Log body cho POST requests (trừ IPN để tránh log quá nhiều)
  if (req.method === 'POST' && !req.path.includes('/momo/ipn') && req.body) {
    const bodyStr = JSON.stringify(req.body);
    console.log('Request body:', bodyStr ? bodyStr.substring(0, 200) : 'empty');
  }
  next();
});

// Tăng limit để nhận base64 images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
const path = require('path');
const uploadsPath = path.join(__dirname, 'uploads');
const avatarsUploadsPath = path.join(__dirname, 'uploads', 'avatars');
const homestaysUploadsPath = path.join(__dirname, 'uploads', 'homestays');
const idcardsUploadsPath = path.join(__dirname, 'uploads', 'idcards');
const reviewsUploadsPath = path.join(__dirname, 'uploads', 'reviews');
const chatUploadsPath = path.join(__dirname, 'uploads', 'chat');

// Tạo thư mục nếu chưa có
const fs = require('fs');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
if (!fs.existsSync(avatarsUploadsPath)) {
  fs.mkdirSync(avatarsUploadsPath, { recursive: true });
}
if (!fs.existsSync(homestaysUploadsPath)) {
  fs.mkdirSync(homestaysUploadsPath, { recursive: true });
}
if (!fs.existsSync(idcardsUploadsPath)) {
  fs.mkdirSync(idcardsUploadsPath, { recursive: true });
}
if (!fs.existsSync(reviewsUploadsPath)) {
  fs.mkdirSync(reviewsUploadsPath, { recursive: true });
}
if (!fs.existsSync(chatUploadsPath)) {
  fs.mkdirSync(chatUploadsPath, { recursive: true });
}

// Serve static files - ĐẶT TRƯỚC routes để tránh conflict
app.use('/uploads', express.static(uploadsPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

console.log('Static files serving from:', uploadsPath);
console.log('Avatars images serving from:', avatarsUploadsPath);
console.log('Homestays images serving from:', homestaysUploadsPath);
console.log('Full avatars path:', path.resolve(avatarsUploadsPath));
console.log('Full homestays path:', path.resolve(homestaysUploadsPath));

// Routes - ĐẶT SAU static files
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/roles', require('./src/routes/roleRoutes'));
app.use('/api/homestays', require('./src/routes/homestayRoutes'));
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/host-requests', require('./src/routes/hostRequestRoutes'));
app.use('/api/coupons', require('./src/routes/couponRoutes'));
app.use('/api/wallet', require('./src/routes/walletRoutes'));
app.use('/api/chats', require('./src/routes/chatRoutes'));
app.use('/api/chat', require('./src/routes/chatRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Public route for system config (no authentication required)
const systemConfigController = require('./src/controllers/systemConfigController');
app.get('/api/system-config', systemConfigController.getConfig.bind(systemConfigController));

// Load notification routes với error handling
try {
  const notificationRoutes = require('./src/routes/notificationRoutes');
  app.use('/api/notifications', notificationRoutes);
  console.log('Notification routes registered successfully');
} catch (error) {
  console.error('Error loading notification routes:', error);
  console.error('Error stack:', error.stack);
}

// Load payment routes với error handling
try {
  const paymentRoutes = require('./src/routes/paymentRoutes');
  app.use('/api/payments', paymentRoutes);
  console.log('Payment routes registered successfully');
} catch (error) {
  console.error('Error loading payment routes:', error);
  console.error('Error stack:', error.stack);
}

console.log('Routes registered:');
console.log('  - /api/auth');
console.log('  - /api/roles');
console.log('  - /api/homestays');
console.log('  - /api/bookings');
console.log('  - /api/payments');
console.log('  - /api/host-requests');
console.log('  - /api/coupons');
console.log('  - /api/wallet');
console.log('  - /api/chats');
console.log('  - /api/chat');
console.log('  - /api/reviews');
console.log('  - /api/notifications');
console.log('  - /api/admin');
console.log('  - /api/system-config (public)');

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

// 404 handler - ĐẶT CUỐI CÙNG
app.use((req, res) => {
  console.log('404 Handler - Route not found:');
  console.log('  Method:', req.method);
  console.log('  Path:', req.path);
  console.log('  URL:', req.url);
  console.log('  Original URL:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại'
  });
});

// Tạo HTTP server để dùng với Socket.io
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Setup socket handler
const { setupSocketIO } = require('./src/socket/socketHandler');
setupSocketIO(io);

// Lưu io instance để có thể dùng ở nơi khác
app.set('io', io);

// Khởi động server
server.listen(PORT, () => {
  console.log(`Server đang chạy tại port ${PORT}`);
  console.log(`Socket.io đã được khởi tạo`);
});

// Export để có thể dùng io ở nơi khác
module.exports = { app, server, getIO: () => io };
