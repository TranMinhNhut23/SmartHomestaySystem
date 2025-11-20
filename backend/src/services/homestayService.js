const axios = require('axios');
const Homestay = require('../models/Homestay');
const Room = require('../models/Room');
const uploadService = require('./uploadService');

class HomestayService {
  // API base URL cho provinces.open-api.vn
  PROVINCES_API_BASE = 'https://provinces.open-api.vn/api';

  // Lấy danh sách tỉnh thành với depth=2 (bao gồm quận/huyện và phường/xã)
  async getProvinces() {
    try {
      const response = await axios.get(`${this.PROVINCES_API_BASE}/v1/`, {
        params: {
          depth: 2
        },
        timeout: 10000 // 10 seconds timeout
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data.map(province => ({
          code: province.code,
          name: province.name,
          districts: province.districts ? province.districts.map(district => ({
            code: district.code,
            name: district.name,
            wards: district.wards ? district.wards.map(ward => ({
              code: ward.code,
              name: ward.name
            })) : []
          })) : []
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching provinces:', error.response?.data || error.message);
      throw new Error('Không thể lấy danh sách tỉnh thành: ' + (error.response?.data?.message || error.message));
    }
  }

  // Lấy danh sách quận/huyện theo mã tỉnh/thành
  async getDistricts(provinceCode) {
    try {
      if (!provinceCode) {
        throw new Error('Mã tỉnh/thành là bắt buộc');
      }

      const response = await axios.get(`${this.PROVINCES_API_BASE}/p/${provinceCode}`, {
        params: {
          depth: 2
        },
        timeout: 10000 // 10 seconds timeout
      });

      if (response.data && response.data.districts) {
        return response.data.districts.map(district => ({
          code: district.code,
          name: district.name,
          wards: district.wards ? district.wards.map(ward => ({
            code: ward.code,
            name: ward.name
          })) : []
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching districts:', error.response?.data || error.message);
      throw new Error('Không thể lấy danh sách quận/huyện: ' + (error.response?.data?.message || error.message));
    }
  }

  // Lấy danh sách phường/xã theo mã quận/huyện
  async getWards(districtCode) {
    try {
      if (!districtCode) {
        throw new Error('Mã quận/huyện là bắt buộc');
      }

      const response = await axios.get(`${this.PROVINCES_API_BASE}/d/${districtCode}`, {
        params: {
          depth: 2
        },
        timeout: 10000 // 10 seconds timeout
      });

      if (response.data && response.data.wards) {
        return response.data.wards.map(ward => ({
          code: ward.code,
          name: ward.name
        }));
      }

      return [];
    } catch (error) {
      console.error('Error fetching wards:', error.response?.data || error.message);
      throw new Error('Không thể lấy danh sách phường/xã: ' + (error.response?.data?.message || error.message));
    }
  }

  // Tạo homestay mới
  async createHomestay(homestayData, hostId) {
    try {
      const {
        name,
        description,
        address,
        googleMapsEmbed,
        pricePerNight,
        images,
        featured,
        requireDeposit,
        rooms,
        amenities
      } = homestayData;

      // Validation
      if (!name || !description || !address) {
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
      }

      // Validate address
      if (!address.province || !address.district || !address.ward || !address.street) {
        throw new Error('Vui lòng điền đầy đủ thông tin địa chỉ');
      }

      // Validate images
      if (!images || !Array.isArray(images) || images.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một ảnh');
      }

      // Validate rooms
      if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
        throw new Error('Vui lòng thêm ít nhất một phòng');
      }

      // Validate từng phòng
      for (const roomGroup of rooms) {
        if (!roomGroup.type || !roomGroup.quantity || !roomGroup.pricePerNight) {
          throw new Error('Mỗi loại phòng phải có: loại phòng, số lượng và giá mỗi đêm');
        }
        if (!['single', 'double', 'twin', 'triple', 'standard', 'deluxe'].includes(roomGroup.type.toLowerCase())) {
          throw new Error('Loại phòng không hợp lệ');
        }
        if (roomGroup.quantity < 1) {
          throw new Error('Số lượng phòng phải lớn hơn 0');
        }
        if (roomGroup.pricePerNight < 0) {
          throw new Error('Giá mỗi đêm phải lớn hơn hoặc bằng 0');
        }
        // Validate tên phòng
        if (!roomGroup.roomNames || !Array.isArray(roomGroup.roomNames) || roomGroup.roomNames.length !== roomGroup.quantity) {
          throw new Error(`Vui lòng nhập đầy đủ tên cho ${roomGroup.quantity} phòng loại ${roomGroup.type}`);
        }
        for (const roomName of roomGroup.roomNames) {
          if (!roomName || roomName.trim().length === 0) {
            throw new Error('Tên phòng không được để trống');
          }
        }
      }

      // Validate amenities (không bắt buộc nhưng nếu có thì phải là array)
      if (amenities && !Array.isArray(amenities)) {
        throw new Error('Tiện nghi phải là mảng');
      }

      // Validate price (nếu có)
      if (pricePerNight !== undefined && pricePerNight < 0) {
        throw new Error('Giá mỗi đêm phải lớn hơn hoặc bằng 0');
      }

      // Lưu ảnh (tạm thời dùng hostId, sau khi tạo homestay sẽ cập nhật lại)
      let savedImages = [];
      try {
        savedImages = await uploadService.saveMultipleBase64Images(images, hostId);
        if (savedImages.length === 0) {
          throw new Error('Không thể lưu ảnh. Vui lòng kiểm tra định dạng ảnh');
        }
      } catch (error) {
        console.error('Error saving images:', error);
        throw new Error('Không thể lưu ảnh: ' + error.message);
      }

      // Tính giá thấp nhất từ các phòng để làm pricePerNight mặc định
      const minPrice = Math.min(...rooms.map(r => r.pricePerNight));
      const finalPricePerNight = pricePerNight !== undefined ? pricePerNight : minPrice;

      // Tạo homestay mới
      const homestay = new Homestay({
        name,
        description,
        address: {
          province: {
            code: address.province.code,
            name: address.province.name
          },
          district: {
            code: address.district.code,
            name: address.district.name
          },
          ward: {
            code: address.ward.code,
            name: address.ward.name
          },
          street: address.street
        },
        googleMapsEmbed: googleMapsEmbed || null,
        pricePerNight: finalPricePerNight,
        images: savedImages,
        amenities: amenities 
          ? [...new Set(amenities.map(a => a.toLowerCase().trim()).filter(Boolean))]
          : [],
        featured: featured === true || featured === 'true',
        requireDeposit: requireDeposit === true || requireDeposit === 'true',
        host: hostId,
        status: 'pending'
      });

      await homestay.save();
      console.log('Homestay created with ID:', homestay._id);

      // Tạo các phòng
      const createdRooms = [];
      try {
        console.log('=== BẮT ĐẦU TẠO ROOMS ===');
        console.log('Creating rooms, total room groups:', rooms.length);
        console.log('Homestay ID:', homestay._id);
        
        if (!rooms || rooms.length === 0) {
          throw new Error('Không có dữ liệu phòng để tạo');
        }

        for (const roomGroup of rooms) {
          console.log(`\n--- Processing room group: ${roomGroup.type} ---`);
          console.log(`Quantity: ${roomGroup.quantity}`);
          console.log(`Price per night: ${roomGroup.pricePerNight}`);
          console.log(`Room names:`, roomGroup.roomNames);

          if (!roomGroup.roomNames || roomGroup.roomNames.length !== roomGroup.quantity) {
            throw new Error(`Số lượng tên phòng không khớp với số lượng phòng cho loại ${roomGroup.type}`);
          }

          for (let i = 0; i < roomGroup.quantity; i++) {
            const roomName = roomGroup.roomNames[i]?.trim();
            if (!roomName || roomName.length === 0) {
              throw new Error(`Tên phòng ${i + 1} của loại ${roomGroup.type} không được để trống`);
            }

            const roomData = {
              homestay: homestay._id,
              type: roomGroup.type.toLowerCase(),
              name: roomName,
              pricePerNight: Number(roomGroup.pricePerNight),
              maxGuests: Room.getDefaultMaxGuests(roomGroup.type),
              status: 'available'
            };
            
            console.log(`Creating room ${i + 1}/${roomGroup.quantity}:`, {
              type: roomData.type,
              name: roomData.name,
              pricePerNight: roomData.pricePerNight
            });
            
            const room = new Room(roomData);
            
            // Validate trước khi save
            const validationError = room.validateSync();
            if (validationError) {
              console.error('Room validation error:', validationError);
              throw new Error(`Lỗi validation phòng ${i + 1}: ${validationError.message}`);
            }
            
            const savedRoom = await room.save();
            console.log(`✓ Room ${i + 1} saved successfully with ID:`, savedRoom._id);
            createdRooms.push(savedRoom);
          }
        }
        console.log(`\n=== HOÀN TẤT: Đã tạo ${createdRooms.length} phòng ===`);
      } catch (roomError) {
        // Nếu tạo rooms thất bại, xóa homestay đã tạo và các rooms đã tạo
        console.error('\n=== LỖI KHI TẠO ROOMS ===');
        console.error('Error creating rooms:', roomError);
        console.error('Error name:', roomError.name);
        console.error('Error message:', roomError.message);
        console.error('Error stack:', roomError.stack);
        
        // Xóa các rooms đã tạo (nếu có)
        if (createdRooms.length > 0) {
          console.log('Deleting created rooms...');
          await Room.deleteMany({ _id: { $in: createdRooms.map(r => r._id) } });
        }
        
        // Xóa homestay đã tạo
        console.log('Deleting homestay...');
        await Homestay.findByIdAndDelete(homestay._id);
        
        throw new Error('Không thể tạo phòng: ' + roomError.message);
      }

      // Populate host thông tin
      await homestay.populate('host', 'username email avatar');

      // Thêm thông tin rooms vào homestay object để trả về
      const homestayObj = homestay.toObject();
      homestayObj.rooms = createdRooms;

      return homestayObj;
    } catch (error) {
      console.error('Error creating homestay:', error);
      
      // Nếu có lỗi khi tạo homestay, xóa các ảnh đã upload
      if (homestayData.images && Array.isArray(homestayData.images)) {
        // Không cần xóa vì chưa tạo homestay thành công
      }
      
      throw error;
    }
  }

  // Lấy danh sách homestay của host
  async getAllHomestays(options = {}) {
    try {
      const { status = 'active', featured, province, district, page = 1, limit = 20 } = options;
      
      const query = {};
      
      // Chỉ hiển thị homestay active
      query.status = status;
      
      if (featured !== undefined) {
        query.featured = featured === true || featured === 'true';
      }
      
      // Filter theo địa chỉ
      if (province) {
        query['address.province.code'] = province;
      }
      if (district) {
        query['address.district.code'] = district;
      }

      console.log('getAllHomestays query:', JSON.stringify(query, null, 2));
      const totalCount = await Homestay.countDocuments(query);
      console.log('Total homestays found:', totalCount);

      const skip = (page - 1) * limit;

      const homestays = await Homestay.find(query)
        .populate('host', 'username email avatar')
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      console.log('Homestays returned:', homestays.length);
      const total = await Homestay.countDocuments(query);

      // Lấy rooms cho từng homestay
      const homestaysWithRooms = await Promise.all(
        homestays.map(async (homestay) => {
          const rooms = await Room.find({ homestay: homestay._id, status: 'available' })
            .sort({ type: 1, name: 1 });
          const homestayObj = homestay.toObject();
          homestayObj.rooms = rooms;
          return homestayObj;
        })
      );

      return {
        homestays: homestaysWithRooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting all homestays:', error);
      throw new Error('Không thể lấy danh sách homestay');
    }
  }

  async getHostHomestays(hostId, options = {}) {
    try {
      const { status, featured, page = 1, limit = 10 } = options;
      
      const query = { host: hostId };
      if (status) {
        query.status = status;
      }
      if (featured !== undefined) {
        query.featured = featured;
      }

      const skip = (page - 1) * limit;

      const homestays = await Homestay.find(query)
        .populate('host', 'username email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Homestay.countDocuments(query);

      // Lấy rooms cho từng homestay
      const homestaysWithRooms = await Promise.all(
        homestays.map(async (homestay) => {
          const rooms = await Room.find({ homestay: homestay._id })
            .sort({ type: 1, name: 1 });
          const homestayObj = homestay.toObject();
          homestayObj.rooms = rooms;
          return homestayObj;
        })
      );

      return {
        homestays: homestaysWithRooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting host homestays:', error);
      throw new Error('Không thể lấy danh sách homestay');
    }
  }

      // Lấy thông tin chi tiết homestay
  async getHomestayById(homestayId) {
    try {
      console.log('homestayService.getHomestayById called with id:', homestayId);
      const homestay = await Homestay.findById(homestayId)
        .populate('host', 'username email avatar');
      
      console.log('Homestay query result:', homestay ? 'Found' : 'Not found');
      if (!homestay) {
        throw new Error('Homestay không tồn tại');
      }

      // Lấy danh sách phòng của homestay
      const rooms = await Room.find({ homestay: homestayId })
        .sort({ type: 1, name: 1 });

      const homestayObj = homestay.toObject();
      homestayObj.rooms = rooms;

      return homestayObj;
    } catch (error) {
      console.error('Error getting homestay:', error);
      throw error;
    }
  }

  // Cập nhật homestay
  async updateHomestay(homestayId, homestayData, hostId) {
    try {
      const {
        name,
        description,
        address,
        googleMapsEmbed,
        pricePerNight,
        images,
        featured,
        requireDeposit,
        rooms,
        amenities
      } = homestayData;

      // Tìm homestay và kiểm tra quyền sở hữu
      const homestay = await Homestay.findById(homestayId);
      if (!homestay) {
        throw new Error('Homestay không tồn tại');
      }

      if (homestay.host.toString() !== hostId.toString()) {
        throw new Error('Bạn không có quyền chỉnh sửa homestay này');
      }

      // Validation
      if (name) homestay.name = name;
      if (description) homestay.description = description;
      if (address) {
        if (address.province) homestay.address.province = address.province;
        if (address.district) homestay.address.district = address.district;
        if (address.ward) homestay.address.ward = address.ward;
        if (address.street !== undefined) homestay.address.street = address.street;
      }
      if (googleMapsEmbed !== undefined) homestay.googleMapsEmbed = googleMapsEmbed || null;
      if (pricePerNight !== undefined) homestay.pricePerNight = pricePerNight;
      if (featured !== undefined) homestay.featured = featured === true || featured === 'true';
      if (requireDeposit !== undefined) homestay.requireDeposit = requireDeposit === true || requireDeposit === 'true';
      if (amenities !== undefined) {
        // Loại bỏ duplicate và normalize về lowercase
        const normalizedAmenities = amenities 
          ? [...new Set(amenities.map(a => a.toLowerCase().trim()).filter(Boolean))]
          : [];
        homestay.amenities = normalizedAmenities;
      }

      // Xử lý ảnh nếu có
      if (images && Array.isArray(images) && images.length > 0) {
        try {
          // Kiểm tra xem ảnh có phải base64 mới không (cần lưu lại)
          // hay đã là URL (giữ nguyên)
          const newBase64Images = images.filter(img => 
            img && img.startsWith('data:image')
          );
          const existingUrls = images.filter(img => 
            img && !img.startsWith('data:image') && !img.startsWith('http')
          );
          
          let finalImages = [...existingUrls];
          
          if (newBase64Images.length > 0) {
            const savedImages = await uploadService.saveMultipleBase64Images(newBase64Images, hostId);
            finalImages = [...finalImages, ...savedImages];
          }
          
          if (finalImages.length > 0) {
            homestay.images = finalImages;
          }
        } catch (error) {
          console.error('Error saving images:', error);
          throw new Error('Không thể lưu ảnh: ' + error.message);
        }
      }

      // Tính giá thấp nhất từ các phòng nếu có cập nhật rooms
      if (rooms && Array.isArray(rooms) && rooms.length > 0) {
        const minPrice = Math.min(...rooms.map(r => r.pricePerNight));
        if (!pricePerNight) {
          homestay.pricePerNight = minPrice;
        }
      }

      await homestay.save();

      // Cập nhật rooms nếu có
      if (rooms && Array.isArray(rooms) && rooms.length > 0) {
        // Xóa các rooms cũ
        await Room.deleteMany({ homestay: homestayId });

        // Tạo rooms mới
        const createdRooms = [];
        for (const roomGroup of rooms) {
          if (!roomGroup.roomNames || roomGroup.roomNames.length !== roomGroup.quantity) {
            throw new Error(`Vui lòng nhập đầy đủ tên cho ${roomGroup.quantity} phòng loại ${roomGroup.type}`);
          }

          for (let i = 0; i < roomGroup.quantity; i++) {
            const roomName = roomGroup.roomNames[i]?.trim();
            if (!roomName || roomName.length === 0) {
              throw new Error(`Tên phòng ${i + 1} của loại ${roomGroup.type} không được để trống`);
            }

            const room = new Room({
              homestay: homestay._id,
              type: roomGroup.type.toLowerCase(),
              name: roomName,
              pricePerNight: Number(roomGroup.pricePerNight),
              maxGuests: Room.getDefaultMaxGuests(roomGroup.type),
              status: 'available'
            });
            await room.save();
            createdRooms.push(room);
          }
        }
      }

      // Populate host và rooms
      await homestay.populate('host', 'username email avatar');
      const roomsList = await Room.find({ homestay: homestayId })
        .sort({ type: 1, name: 1 });

      const homestayObj = homestay.toObject();
      homestayObj.rooms = roomsList;

      return homestayObj;
    } catch (error) {
      console.error('Error updating homestay:', error);
      throw error;
    }
  }

  // Duyệt homestay (admin)
  async approveHomestay(homestayId, adminId) {
    try {
      const homestay = await Homestay.findById(homestayId);
      
      if (!homestay) {
        throw new Error('Không tìm thấy homestay');
      }

      if (homestay.status !== 'pending') {
        throw new Error('Chỉ có thể duyệt homestay đang chờ duyệt');
      }

      homestay.status = 'active';
      homestay.rejectedReason = null; // Xóa lý do từ chối khi duyệt
      homestay.updatedAt = new Date();
      await homestay.save();

      await homestay.populate('host', 'username email');

      return homestay;
    } catch (error) {
      console.error('Error approving homestay:', error);
      throw error;
    }
  }

  // Từ chối homestay (admin)
  async rejectHomestay(homestayId, adminId, reason = '') {
    try {
      const homestay = await Homestay.findById(homestayId);
      
      if (!homestay) {
        throw new Error('Không tìm thấy homestay');
      }

      if (homestay.status !== 'pending') {
        throw new Error('Chỉ có thể từ chối homestay đang chờ duyệt');
      }

      homestay.status = 'rejected';
      homestay.rejectedReason = reason ? reason.trim() : '';
      homestay.updatedAt = new Date();
      await homestay.save();

      await homestay.populate('host', 'username email');

      return homestay;
    } catch (error) {
      console.error('Error rejecting homestay:', error);
      throw error;
    }
  }

  // Lấy danh sách homestay đang chờ duyệt (admin)
  async getPendingHomestays(options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      
      const query = { status: 'pending' };

      const skip = (page - 1) * limit;

      const homestays = await Homestay.find(query)
        .populate('host', 'username email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Homestay.countDocuments(query);

      // Lấy rooms cho từng homestay
      const homestaysWithRooms = await Promise.all(
        homestays.map(async (homestay) => {
          const rooms = await Room.find({ homestay: homestay._id })
            .sort({ type: 1, name: 1 });
          const homestayObj = homestay.toObject();
          homestayObj.rooms = rooms;
          return homestayObj;
        })
      );

      return {
        homestays: homestaysWithRooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting pending homestays:', error);
      throw error;
    }
  }
}

module.exports = new HomestayService();

