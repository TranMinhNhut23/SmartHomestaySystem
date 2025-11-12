const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên role là bắt buộc'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [2, 'Tên role phải có ít nhất 2 ký tự'],
    maxlength: [50, 'Tên role không được vượt quá 50 ký tự']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  permissions: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
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
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

// Method để kiểm tra permission
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Method để thêm permission
roleSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this.save();
};

// Method để xóa permission
roleSchema.methods.removePermission = function(permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this.save();
};

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;


