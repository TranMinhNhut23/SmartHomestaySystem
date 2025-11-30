const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username là bắt buộc'],
    unique: true,
    trim: true,
    minlength: [3, 'Username phải có ít nhất 3 ký tự'],
    maxlength: [30, 'Username không được vượt quá 30 ký tự']
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ (10-11 chữ số)'],
    default: null
  },
  password: {
    type: String,
    required: function() {
      // Password không bắt buộc nếu đăng nhập bằng Google
      return !this.googleId;
    },
    minlength: [6, 'Password phải có ít nhất 6 ký tự']
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Cho phép null và chỉ unique khi có giá trị
    default: null
  },
  avatar: {
    type: String,
    default: null,
    // Giới hạn độ dài để tránh base64 quá lớn
    maxlength: [10000000, 'Ảnh đại diện quá lớn'] // ~10MB base64
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null
  },
  // Giữ roleName để backward compatibility
  roleName: {
    type: String,
    enum: ['user', 'host', 'admin'],
    default: 'user'
  },
  // Ví tiền của user
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password trước khi lưu (chỉ khi có password)
userSchema.pre('save', async function(next) {
  // Bỏ qua nếu không có password (ví dụ: đăng nhập bằng Google)
  if (!this.password || !this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method để so sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Loại bỏ password khi trả về JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
