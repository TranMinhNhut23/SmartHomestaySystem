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

  // Lưu nhiều base64 images cho homestay
  async saveMultipleBase64Images(base64Images, homestayId) {
    try {
      if (!Array.isArray(base64Images) || base64Images.length === 0) {
        return [];
      }

      const savedImages = [];
      // Sử dụng đường dẫn từ root của backend
      // __dirname = backend/src/services, nên ../../uploads/homestays = backend/uploads/homestays
      const uploadDir = path.join(__dirname, '../../uploads/homestays');

      // Tạo thư mục nếu chưa có
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory:', uploadDir);
      }
      
      console.log('Saving images to directory:', uploadDir);

      for (let i = 0; i < base64Images.length; i++) {
        const base64String = base64Images[i];
        
        // Kiểm tra nếu không phải base64 image
        if (!base64String || !base64String.startsWith('data:image')) {
          console.warn(`Image ${i + 1} is not base64, skipping`);
          continue;
        }

        // Parse base64 string
        const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          console.warn(`Image ${i + 1}: Base64 string không hợp lệ, bỏ qua`);
          continue;
        }

        const imageType = matches[1];
        const base64Data = matches[2];

        // Validate image type
        const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
        if (!allowedTypes.includes(imageType.toLowerCase())) {
          console.warn(`Image ${i + 1}: Định dạng ảnh ${imageType} không được hỗ trợ, bỏ qua`);
          continue;
        }

        // Validate size (max 5MB)
        const sizeInMB = (base64Data.length * 3) / 4 / 1024 / 1024;
        if (sizeInMB > 5) {
          console.warn(`Image ${i + 1}: Ảnh quá lớn (${sizeInMB.toFixed(2)}MB), bỏ qua`);
          continue;
        }

        // Tạo tên file
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `homestay-${homestayId || 'temp'}-${uniqueSuffix}.${imageType}`;
        const filePath = path.join(uploadDir, filename);

        // Convert base64 sang buffer và lưu file
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        // Verify file was saved
        if (!fs.existsSync(filePath)) {
          console.error('Failed to save file:', filePath);
          continue;
        }
        
        console.log('✓ Saved image:', filename);
        console.log('  Path:', filePath);
        console.log('  Size:', (buffer.length / 1024).toFixed(2), 'KB');

        // Lưu URL relative để frontend có thể sử dụng
        // Format: /uploads/homestays/filename
        const imageUrl = `/uploads/homestays/${filename}`;
        savedImages.push(imageUrl);
      }

      return savedImages;
    } catch (error) {
      console.error('Error saving multiple base64 images:', error);
      throw new Error('Không thể lưu ảnh');
    }
  }

  // Lấy URL của ảnh homestay
  getHomestayImageUrl(filename) {
    if (!filename) return null;

    // Nếu đã là URL đầy đủ hoặc base64, trả về nguyên
    if (filename.startsWith('http') || filename.startsWith('data:image')) {
      return filename;
    }

    // Trả về URL relative
    return `/uploads/homestays/${filename}`;
  }

  // Xóa ảnh homestay
  deleteHomestayImage(filename) {
    try {
      if (!filename) return;

      // Nếu là URL, extract filename
      let actualFilename = filename;
      if (filename.includes('/')) {
        actualFilename = path.basename(filename);
      }

      const uploadDir = path.join(__dirname, '../../uploads/homestays');
      const filePath = path.join(uploadDir, actualFilename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Đã xóa file homestay: ${actualFilename}`);
      }
    } catch (error) {
      console.error('Error deleting homestay image:', error);
    }
  }

  // Xóa nhiều ảnh homestay
  deleteMultipleHomestayImages(filenames) {
    if (!Array.isArray(filenames)) return;
    
    filenames.forEach(filename => {
      this.deleteHomestayImage(filename);
    });
  }

  // Lưu base64 image cho ID card (CCCD)
  async saveIdCardImage(base64String, userId, side = 'front') {
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

      // Validate image type
      const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
      if (!allowedTypes.includes(imageType.toLowerCase())) {
        throw new Error(`Định dạng ảnh ${imageType} không được hỗ trợ`);
      }

      // Validate size (max 5MB)
      const sizeInMB = (base64Data.length * 3) / 4 / 1024 / 1024;
      if (sizeInMB > 5) {
        throw new Error(`Ảnh quá lớn (${sizeInMB.toFixed(2)}MB). Kích thước tối đa là 5MB`);
      }

      // Tạo tên file
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `idcard-${userId}-${side}-${uniqueSuffix}.${imageType}`;
      const uploadDir = path.join(__dirname, '../../uploads/idcards');

      // Tạo thư mục nếu chưa có
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);

      // Convert base64 sang buffer và lưu file
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Trả về URL relative
      return `/uploads/idcards/${filename}`;
    } catch (error) {
      console.error('Error saving ID card image:', error);
      throw new Error('Không thể lưu ảnh CCCD');
    }
  }

  // Xóa ảnh ID card
  deleteIdCardImage(filename) {
    try {
      if (!filename) return;

      // Nếu là URL, extract filename
      let actualFilename = filename;
      if (filename.includes('/')) {
        actualFilename = path.basename(filename);
      }

      const uploadDir = path.join(__dirname, '../../uploads/idcards');
      const filePath = path.join(uploadDir, actualFilename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Đã xóa file ID card: ${actualFilename}`);
      }
    } catch (error) {
      console.error('Error deleting ID card image:', error);
    }
  }

  // Lấy URL của ảnh ID card
  getIdCardImageUrl(filename) {
    if (!filename) return null;

    // Nếu đã là URL đầy đủ hoặc base64, trả về nguyên
    if (filename.startsWith('http') || filename.startsWith('data:image')) {
      return filename;
    }

    // Trả về URL relative
    return `/uploads/idcards/${filename}`;
  }
}

module.exports = new UploadService();



