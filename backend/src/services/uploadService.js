const fs = require('fs');
const path = require('path');

class UploadService {
  // Lưu base64 image vào file
  async saveBase64Image(base64String, userId) {
    try {
      // Kiểm tra nếu không phải base64 image
      if (!base64String || !base64String.startsWith('data:image')) {
        return null;
      }

      // Parse base64 string
      const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Base64 string không hợp lệ');
      }

      const imageType = matches[1];
      const base64Data = matches[2];

      // Tạo tên file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `avatar-${userId}-${uniqueSuffix}.${imageType}`;
      const uploadDir = path.join(__dirname, '../uploads/avatars');

      // Tạo thư mục nếu chưa có
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // Convert base64 sang buffer và lưu file
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Trả về tên file (sẽ được dùng để tạo URL)
      return filename;
    } catch (error) {
      console.error('Error saving base64 image:', error);
      throw new Error('Không thể lưu ảnh');
    }
  }

  // Xóa file ảnh
  deleteImage(filename) {
    try {
      if (!filename) return;

      // Nếu là URL, extract filename
      let actualFilename = filename;
      if (filename.includes('/')) {
        actualFilename = path.basename(filename);
      }

      const uploadDir = path.join(__dirname, '../uploads/avatars');
      const filePath = path.join(uploadDir, actualFilename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Đã xóa file: ${actualFilename}`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  // Lấy URL của file
  getImageUrl(filename) {
    if (!filename) return null;

    // Nếu đã là URL đầy đủ hoặc base64, trả về nguyên
    if (filename.startsWith('http') || filename.startsWith('data:image')) {
      return filename;
    }

    // Trả về URL relative
    return `/uploads/avatars/${filename}`;
  }
}

module.exports = new UploadService();


