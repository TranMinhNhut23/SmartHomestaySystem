import { HomestayFormData } from '@/types/homestay';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation cho form chỉnh sửa homestay (bước 1 - thông tin cơ bản)
 */
export const validateEditHomestayForm = (formData: HomestayFormData): ValidationResult => {
  // Validate tên homestay
  if (!formData.name || !formData.name.trim()) {
    return { isValid: false, error: 'Vui lòng nhập tên homestay' };
  }
  if (formData.name.trim().length < 3) {
    return { isValid: false, error: 'Tên homestay phải có ít nhất 3 ký tự' };
  }
  if (formData.name.trim().length > 200) {
    return { isValid: false, error: 'Tên homestay không được vượt quá 200 ký tự' };
  }

  // Validate mô tả
  if (!formData.description || !formData.description.trim()) {
    return { isValid: false, error: 'Vui lòng nhập mô tả' };
  }
  if (formData.description.trim().length < 10) {
    return { isValid: false, error: 'Mô tả phải có ít nhất 10 ký tự' };
  }
  if (formData.description.trim().length > 5000) {
    return { isValid: false, error: 'Mô tả không được vượt quá 5000 ký tự' };
  }

  // Validate địa chỉ
  if (!formData.address.province || !formData.address.province.code) {
    return { isValid: false, error: 'Vui lòng chọn tỉnh/thành phố' };
  }
  if (!formData.address.district || !formData.address.district.code) {
    return { isValid: false, error: 'Vui lòng chọn quận/huyện' };
  }
  if (!formData.address.ward || !formData.address.ward.code) {
    return { isValid: false, error: 'Vui lòng chọn phường/xã' };
  }
  if (!formData.address.street || !formData.address.street.trim()) {
    return { isValid: false, error: 'Vui lòng nhập số nhà, tên đường' };
  }
  if (formData.address.street.trim().length > 200) {
    return { isValid: false, error: 'Địa chỉ đường không được vượt quá 200 ký tự' };
  }

  // Validate Google Maps Embed (không bắt buộc nhưng nếu có thì phải hợp lệ)
  if (formData.googleMapsEmbed && formData.googleMapsEmbed.trim().length > 2000) {
    return { isValid: false, error: 'Mã nhúng Google Maps quá dài (tối đa 2000 ký tự)' };
  }

  // Validate giá mỗi đêm
  if (formData.pricePerNight) {
    const price = parseFloat(formData.pricePerNight);
    if (isNaN(price) || price < 0) {
      return { isValid: false, error: 'Giá mỗi đêm phải là số lớn hơn hoặc bằng 0' };
    }
  }

  // Validate hình ảnh
  if (!formData.images || formData.images.length === 0) {
    return { isValid: false, error: 'Vui lòng chọn ít nhất một ảnh' };
  }

  return { isValid: true };
};

/**
 * Validation đầy đủ cho homestay (bao gồm cả phòng và tiện nghi)
 */
export const validateEditHomestayFormFull = (formData: HomestayFormData): ValidationResult => {
  // Validate thông tin cơ bản trước
  const basicValidation = validateEditHomestayForm(formData);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Validate phòng
  if (!formData.rooms || formData.rooms.length === 0) {
    return { isValid: false, error: 'Vui lòng thêm ít nhất một phòng' };
  }

  for (let i = 0; i < formData.rooms.length; i++) {
    const room = formData.rooms[i];
    
    if (!room.type) {
      return { isValid: false, error: `Vui lòng chọn loại phòng cho phòng ${i + 1}` };
    }
    
    if (!room.quantity || room.quantity < 1) {
      return { isValid: false, error: `Số lượng phòng ${i + 1} phải lớn hơn 0` };
    }
    
    if (room.pricePerNight === undefined || room.pricePerNight < 0) {
      return { isValid: false, error: `Giá mỗi đêm của phòng ${i + 1} phải lớn hơn hoặc bằng 0` };
    }
    
    if (!room.roomNames || room.roomNames.length !== room.quantity) {
      return {
        isValid: false,
        error: `Vui lòng nhập đầy đủ tên cho ${room.quantity} phòng loại ${room.type}`,
      };
    }
    
    for (let j = 0; j < room.roomNames.length; j++) {
      if (!room.roomNames[j] || room.roomNames[j].trim().length === 0) {
        return {
          isValid: false,
          error: `Vui lòng nhập tên cho phòng ${j + 1} loại ${room.type}`,
        };
      }
    }
  }

  // Validate amenities (không bắt buộc nhưng nếu có thì phải là array)
  if (formData.amenities && !Array.isArray(formData.amenities)) {
    return { isValid: false, error: 'Tiện nghi phải là mảng' };
  }

  return { isValid: true };
};

/**
 * Helper để normalize amenities từ DB (lowercase) về format của AMENITIES constant
 */
export const normalizeAmenitiesFromDB = (
  dbAmenities: string[],
  availableAmenities: string[]
): string[] => {
  if (!dbAmenities || !Array.isArray(dbAmenities)) {
    return [];
  }

  // Tạo map từ lowercase sang original format
  const amenityMap = new Map<string, string>();
  availableAmenities.forEach((amenity) => {
    amenityMap.set(amenity.toLowerCase(), amenity);
  });

  // Map amenities từ DB về format original và loại bỏ duplicate
  const normalizedSet = new Set<string>();
  dbAmenities.forEach((amenity) => {
    const normalized = amenity.toLowerCase().trim();
    const originalFormat = amenityMap.get(normalized);
    if (originalFormat && availableAmenities.includes(originalFormat)) {
      normalizedSet.add(originalFormat);
    }
  });

  return Array.from(normalizedSet);
};

/**
 * Helper để normalize amenities từ form về format DB (lowercase)
 */
export const normalizeAmenitiesToDB = (amenities: string[]): string[] => {
  if (!amenities || !Array.isArray(amenities)) {
    return [];
  }

  // Normalize về lowercase, loại bỏ duplicate và empty values
  const normalizedSet = new Set<string>();
  amenities.forEach((amenity) => {
    const normalized = amenity.toLowerCase().trim();
    if (normalized) {
      normalizedSet.add(normalized);
    }
  });

  return Array.from(normalizedSet);
};

