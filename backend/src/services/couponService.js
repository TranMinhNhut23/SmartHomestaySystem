const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');

class CouponService {
  // Validate và áp dụng mã giảm giá
  async validateAndApplyCoupon(code, totalPrice, userId, bookingId = null, homestayId = null) {
    try {
      if (!code || !code.trim()) {
        throw new Error('Mã giảm giá là bắt buộc');
      }

      // Tìm coupon theo code
      const coupon = await Coupon.findOne({ 
        code: code.toUpperCase().trim(),
        status: 'active'
      });

      if (!coupon) {
        throw new Error('Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa');
      }

      // Kiểm tra thời gian hiệu lực
      const now = new Date();
      if (coupon.startDate > now) {
        throw new Error('Mã giảm giá chưa có hiệu lực');
      }
      if (coupon.endDate < now) {
        throw new Error('Mã giảm giá đã hết hạn');
      }

      // Kiểm tra phạm vi áp dụng
      if (coupon.appliesTo === 'host') {
        if (!homestayId) {
          throw new Error('Mã giảm giá này chỉ áp dụng cho homestay của host. Thiếu thông tin homestay.');
        }
        
        // Fix coupon cũ: nếu hostId null, tự động set từ creatorId
        if (!coupon.hostId && coupon.creatorId) {
          coupon.hostId = coupon.creatorId;
          await coupon.save();
          console.log(`Fixed coupon ${coupon.code} during validation: set hostId to ${coupon.creatorId}`);
        }
        
        if (!coupon.hostId) {
          throw new Error('Mã giảm giá này không có thông tin host. Vui lòng liên hệ quản trị viên.');
        }
        
        const Homestay = require('../models/Homestay');
        const homestay = await Homestay.findById(homestayId).select('host');
        if (!homestay) {
          throw new Error('Homestay không tồn tại');
        }
        
        // So sánh hostId của coupon với host của homestay
        const couponHostId = coupon.hostId.toString();
        const homestayHostId = homestay.host.toString();
        
        console.log('Validating coupon host match:', {
          couponCode: coupon.code,
          couponHostId,
          homestayHostId,
          homestayId,
          matches: couponHostId === homestayHostId
        });
        
        if (couponHostId !== homestayHostId) {
          throw new Error('Mã giảm giá này chỉ áp dụng cho homestay của host tạo ra mã. Vui lòng chọn homestay khác hoặc sử dụng mã khác.');
        }
      }
      
      // Nếu appliesTo === 'all', không cần kiểm tra hostId, áp dụng cho tất cả homestay

      // Kiểm tra số lần sử dụng tối đa
      if (coupon.maxUsageTotal && coupon.usedCount >= coupon.maxUsageTotal) {
        throw new Error('Mã giảm giá đã hết lượt sử dụng');
      }

      // Kiểm tra đơn hàng tối thiểu
      if (coupon.minOrder && totalPrice < coupon.minOrder) {
        throw new Error(`Đơn hàng tối thiểu phải là ${coupon.minOrder.toLocaleString('vi-VN')} VNĐ`);
      }

      // Kiểm tra số lần sử dụng mỗi user (nếu có userId)
      if (userId && coupon.maxUsagePerUser) {
        const userUsageCount = await Booking.countDocuments({
          guest: userId,
          couponCode: coupon.code,
          paymentStatus: 'paid'
        });

        if (userUsageCount >= coupon.maxUsagePerUser) {
          throw new Error(`Bạn đã sử dụng mã giảm giá này ${coupon.maxUsagePerUser} lần`);
        }
      }

      // Tính toán giá giảm
      let discountAmount = 0;
      
      if (coupon.discountType === 'percent') {
        discountAmount = (totalPrice * coupon.discountValue) / 100;
        // Áp dụng maxDiscount nếu có
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else {
        // fixed
        discountAmount = coupon.discountValue;
        // Không được giảm quá tổng giá
        if (discountAmount > totalPrice) {
          discountAmount = totalPrice;
        }
      }

      const finalPrice = Math.max(0, totalPrice - discountAmount);

      return {
        coupon: {
          _id: coupon._id,
          name: coupon.name,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
        },
        originalPrice: totalPrice,
        discountAmount,
        finalPrice,
        isValid: true
      };
    } catch (error) {
      throw error;
    }
  }

  // Tạo coupon mới (admin)
  async createCoupon(couponData, creatorId) {
    try {
      const User = require('../models/User');
      // Lấy user với cả roleName và role object để đảm bảo
      const creator = await User.findById(creatorId).populate('role');
      
      if (!creator) {
        throw new Error('Không tìm thấy người dùng');
      }
      
      // Lấy roleName từ role object hoặc roleName field
      let roleName = creator.roleName || 'user';
      if (creator.role && typeof creator.role === 'object' && creator.role.name) {
        roleName = creator.role.name.toLowerCase();
      } else if (creator.roleName) {
        roleName = creator.roleName.toLowerCase();
      }
      
      console.log('Creating coupon - Creator info:', {
        creatorId,
        username: creator.username,
        roleName: roleName,
        roleNameField: creator.roleName,
        roleObject: creator.role ? (typeof creator.role === 'object' ? creator.role.name : creator.role) : null
      });
      
      const isAdmin = roleName === 'admin';
      const isHost = roleName === 'host';
      
      console.log('Role check:', {
        isAdmin,
        isHost,
        roleName: roleName,
        typeOfRoleName: typeof roleName
      });
      
      if (!isAdmin && !isHost) {
        console.error('Invalid role for creating coupon:', {
          roleName,
          creatorId,
          username: creator.username
        });
        throw new Error(`Chỉ host hoặc admin mới có thể tạo mã giảm giá. Role hiện tại: ${roleName || 'user'}`);
      }
      const {
        name,
        code,
        discountType,
        discountValue,
        maxDiscount,
        minOrder,
        maxUsagePerUser,
        maxUsageTotal,
        startDate,
        endDate,
        status = 'active'
      } = couponData;

      // Validation
      if (!name || !code || !discountType || !discountValue || !startDate || !endDate) {
        throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
      }

      // Kiểm tra code đã tồn tại chưa
      const existingCoupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (existingCoupon) {
        throw new Error('Mã giảm giá này đã tồn tại');
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      }

      // Validate discount value
      if (discountType === 'percent' && discountValue > 100) {
        throw new Error('Giảm giá phần trăm không được vượt quá 100%');
      }

      // Xác định appliesTo và hostId
      let appliesToValue = 'all';
      let hostIdValue = null;
      
      if (isHost) {
        appliesToValue = 'host';
        hostIdValue = creatorId; // Host tạo coupon thì hostId = creatorId
      } else if (isAdmin) {
        appliesToValue = 'all';
        hostIdValue = null; // Admin tạo coupon thì appliesTo = 'all', hostId = null
      }
      // Không cần else vì đã check ở trên

      console.log('Creating coupon:', {
        creatorId,
        creatorRole: creator?.roleName,
        isAdmin,
        isHost,
        appliesTo: appliesToValue,
        hostId: hostIdValue
      });

      const coupon = new Coupon({
        name: name.trim(),
        code: code.toUpperCase().trim(),
        discountType,
        discountValue,
        maxDiscount: maxDiscount || null,
        minOrder: minOrder || null,
        maxUsagePerUser: maxUsagePerUser || null,
        maxUsageTotal: maxUsageTotal || null,
        startDate: start,
        endDate: end,
        status,
        creatorId,
        appliesTo: appliesToValue,
        hostId: hostIdValue
      });

      // Pre-save hook sẽ tự động set hostId nếu cần
      await coupon.save();
      
      // Đảm bảo hostId đã được set đúng
      if (coupon.appliesTo === 'host' && !coupon.hostId) {
        coupon.hostId = creatorId;
        await coupon.save();
      }
      
      return coupon;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả coupons (admin)
  async getAllCoupons(options = {}, requester = null) {
    try {
      const { status, page = 1, limit = 20 } = options;
      const query = {};

      // Nếu requester là host, chỉ xem coupon của chính host
      if (requester && requester.roleName === 'host' && requester.userId) {
        query.appliesTo = 'host';
        query.hostId = requester.userId;
      }
      // Nếu là admin, lấy tất cả (không filter)
      
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      
      const coupons = await Coupon.find(query)
        .populate('creatorId', 'username email avatar')
        .populate({
          path: 'hostId',
          select: 'username email avatar',
          model: 'User',
          strictPopulate: false
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Fix coupon cũ: nếu appliesTo === 'host' nhưng hostId null, set hostId = creatorId
      for (const coupon of coupons) {
        if (coupon.appliesTo === 'host' && !coupon.hostId && coupon.creatorId) {
          coupon.hostId = coupon.creatorId;
          await coupon.save();
          console.log(`Fixed coupon ${coupon.code} in getAllCoupons: set hostId to ${coupon.creatorId}`);
          // Repopulate hostId sau khi save
          await coupon.populate({
            path: 'hostId',
            select: 'username email avatar',
            model: 'User'
          });
        }
      }

      const total = await Coupon.countDocuments(query);

      return {
        coupons,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy coupon theo ID
  async getCouponById(couponId) {
    try {
      const coupon = await Coupon.findById(couponId)
        .populate('creatorId', 'username email');
      
      if (!coupon) {
        throw new Error('Mã giảm giá không tồn tại');
      }

      return coupon;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật coupon
  async updateCoupon(couponId, updateData, updaterId, updaterRole = null) {
    try {
      const coupon = await Coupon.findById(couponId);
      
      if (!coupon) {
        throw new Error('Mã giảm giá không tồn tại');
      }

      // Kiểm tra quyền sở hữu nếu là host
      if (coupon.appliesTo === 'host' && coupon.hostId) {
        const User = require('../models/User');
        const updater = await User.findById(updaterId).select('roleName');
        
        // Nếu là host và không phải chủ sở hữu
        if (updater && updater.roleName === 'host' && coupon.hostId.toString() !== updaterId.toString()) {
          throw new Error('Bạn không có quyền chỉnh sửa mã giảm giá này');
        }
        
        // Nếu là admin và mã thuộc host, chỉ cho phép update status
        if (updaterRole === 'admin' && coupon.appliesTo === 'host') {
          const allowedFields = ['status'];
          const restrictedFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
          if (restrictedFields.length > 0) {
            throw new Error(`Admin chỉ có thể thay đổi trạng thái của mã giảm giá thuộc host. Không được phép chỉnh sửa: ${restrictedFields.join(', ')}`);
          }
          // Chỉ update status
          coupon.status = updateData.status;
          coupon.updatedAt = new Date();
          await coupon.save();
          return coupon;
        }
      }

      // Nếu là chủ sở hữu hoặc admin với mã của admin, cho phép update tất cả
      // Nếu thay đổi code, kiểm tra code mới có trùng không
      if (updateData.code && updateData.code.toUpperCase().trim() !== coupon.code) {
        const existingCoupon = await Coupon.findOne({ 
          code: updateData.code.toUpperCase().trim(),
          _id: { $ne: couponId }
        });
        if (existingCoupon) {
          throw new Error('Mã giảm giá này đã tồn tại');
        }
        updateData.code = updateData.code.toUpperCase().trim();
      }

      // Validate dates nếu có thay đổi
      if (updateData.startDate || updateData.endDate) {
        const start = updateData.startDate ? new Date(updateData.startDate) : coupon.startDate;
        const end = updateData.endDate ? new Date(updateData.endDate) : coupon.endDate;
        if (end < start) {
          throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
        }
      }

      // Validate discount value
      if (updateData.discountType === 'percent' && updateData.discountValue > 100) {
        throw new Error('Giảm giá phần trăm không được vượt quá 100%');
      }

      Object.assign(coupon, updateData);
      coupon.updatedAt = new Date();
      
      await coupon.save();
      return coupon;
    } catch (error) {
      throw error;
    }
  }

  // Xóa coupon
  async deleteCoupon(couponId, deleterId = null, deleterRole = null) {
    try {
      const coupon = await Coupon.findById(couponId);
      
      if (!coupon) {
        throw new Error('Mã giảm giá không tồn tại');
      }

      // Kiểm tra quyền xóa
      if (deleterId && deleterRole) {
        const User = require('../models/User');
        const deleter = await User.findById(deleterId).select('roleName');
        
        // Admin không được xóa mã của host
        if (deleter && deleter.roleName === 'admin' && coupon.appliesTo === 'host') {
          throw new Error('Admin không được phép xóa mã giảm giá của host');
        }
        
        // Host chỉ được xóa mã của mình
        if (deleter && deleter.roleName === 'host' && coupon.appliesTo === 'host') {
          if (!coupon.hostId || coupon.hostId.toString() !== deleterId.toString()) {
            throw new Error('Bạn không có quyền xóa mã giảm giá này');
          }
        }
      }

      // Kiểm tra đã có booking sử dụng coupon này chưa
      const usedInBooking = await Booking.countDocuments({ couponCode: coupon.code });
      if (usedInBooking > 0) {
        // Nếu đã có booking sử dụng, chỉ set inactive
        coupon.status = 'inactive';
        await coupon.save();
        return { message: 'Mã giảm giá đã được vô hiệu hóa vì đã có booking sử dụng' };
      }

      await Coupon.findByIdAndDelete(couponId);
      return { message: 'Mã giảm giá đã được xóa' };
    } catch (error) {
      throw error;
    }
  }

  // Tăng số lần sử dụng coupon (khi booking được thanh toán thành công)
  async incrementCouponUsage(code) {
    try {
      const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
      if (coupon) {
        coupon.usedCount = (coupon.usedCount || 0) + 1;
        await coupon.save();
      }
    } catch (error) {
      console.error('Error incrementing coupon usage:', error);
    }
  }

  // Lấy danh sách coupons active cho user xem
  async getActiveCoupons() {
    try {
      const now = new Date();
      console.log('Querying active coupons at:', now);
      
      // Lấy tất cả coupons active (không filter theo date và usage trước)
      const allActiveCoupons = await Coupon.find({
        status: 'active'
      }).sort({ createdAt: -1 }).limit(50);
      
      console.log(`Found ${allActiveCoupons.length} coupons with status='active'`);
      
      // Fix coupon cũ: nếu appliesTo === 'host' nhưng hostId null, set hostId = creatorId
      for (const coupon of allActiveCoupons) {
        if (coupon.appliesTo === 'host' && !coupon.hostId && coupon.creatorId) {
          coupon.hostId = coupon.creatorId;
          await coupon.save();
          console.log(`Fixed coupon ${coupon.code}: set hostId to ${coupon.creatorId}`);
        }
      }

      // Chỉ filter theo thời gian hiệu lực (không filter theo usage)
      // Frontend sẽ phân loại: quá hạn (không hiển thị), còn hạn nhưng hết lượt (hiển thị mờ), còn hạn và còn lượt (hiển thị bình thường)
      const validDateCoupons = allActiveCoupons.filter(coupon => {
        // Chỉ kiểm tra thời gian hiệu lực
        const isValidDate = coupon.startDate <= now && coupon.endDate >= now;
        
        if (!isValidDate) {
          console.log(`Coupon ${coupon.code} is expired. Start: ${coupon.startDate}, End: ${coupon.endDate}`);
        }
        
        return isValidDate;
      });
      
      console.log(`Found ${validDateCoupons.length} coupons within valid date range`);

      return validDateCoupons.map(coupon => {
        // Kiểm tra số lần sử dụng
        const isOutOfUsage = coupon.maxUsageTotal && coupon.usedCount >= coupon.maxUsageTotal;
        
        return {
          _id: coupon._id,
          name: coupon.name,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
          minOrder: coupon.minOrder,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          status: coupon.status, // Thêm status
          appliesTo: coupon.appliesTo, // Thêm appliesTo
          hostId: coupon.hostId, // Thêm hostId
          usedCount: coupon.usedCount || 0,
          maxUsageTotal: coupon.maxUsageTotal,
          isOutOfUsage: isOutOfUsage // Thêm flag để frontend dễ xử lý
        };
      });
    } catch (error) {
      console.error('Error in getActiveCoupons:', error);
      throw error;
    }
  }
}

module.exports = new CouponService();

