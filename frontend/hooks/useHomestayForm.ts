import { useState } from 'react';
import { HomestayFormData, Address, RoomGroup } from '@/types/homestay';

const initialFormData: HomestayFormData = {
  name: '',
  description: '',
  address: {
    province: { code: '', name: '' },
    district: { code: '', name: '' },
    ward: { code: '', name: '' },
    street: '',
  },
  googleMapsEmbed: '',
  pricePerNight: '',
  images: [],
  featured: false,
  requireDeposit: false,
  rooms: [],
  amenities: [],
};

export function useHomestayForm() {
  const [formData, setFormData] = useState<HomestayFormData>(initialFormData);
  const [imageUris, setImageUris] = useState<string[]>([]);

  const updateField = <K extends keyof HomestayFormData>(
    field: K,
    value: HomestayFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddress = (address: Address) => {
    setFormData((prev) => ({ ...prev, address }));
  };

  const updateImages = (images: string[], uris: string[]) => {
    setFormData((prev) => ({ ...prev, images }));
    setImageUris(uris);
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setImageUris([]);
  };

  const updateRooms = (rooms: RoomGroup[]) => {
    setFormData((prev) => ({ ...prev, rooms }));
  };

  const updateRoomGroup = (index: number, roomGroup: Partial<RoomGroup>) => {
    setFormData((prev) => {
      const newRooms = [...prev.rooms];
      newRooms[index] = { ...newRooms[index], ...roomGroup };
      return { ...prev, rooms: newRooms };
    });
  };

  const addRoomGroup = (roomGroup: RoomGroup) => {
    setFormData((prev) => ({ ...prev, rooms: [...prev.rooms, roomGroup] }));
  };

  const removeRoomGroup = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index),
    }));
  };

  const updateAmenities = (amenities: string[]) => {
    setFormData((prev) => ({ ...prev, amenities }));
  };

  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const isSelected = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: isSelected
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  // Validate form cơ bản (cho trang đầu tiên)
  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!formData.name.trim()) {
      return { isValid: false, error: 'Vui lòng nhập tên homestay' };
    }
    if (!formData.description.trim()) {
      return { isValid: false, error: 'Vui lòng nhập mô tả' };
    }
    if (!formData.address.province.code) {
      return { isValid: false, error: 'Vui lòng chọn tỉnh/thành' };
    }
    if (!formData.address.district.code) {
      return { isValid: false, error: 'Vui lòng chọn quận/huyện' };
    }
    if (!formData.address.ward.code) {
      return { isValid: false, error: 'Vui lòng chọn phường/xã' };
    }
    if (!formData.address.street.trim()) {
      return { isValid: false, error: 'Vui lòng nhập số nhà, tên đường' };
    }
    if (formData.images.length === 0) {
      return { isValid: false, error: 'Vui lòng chọn ít nhất một ảnh' };
    }
    return { isValid: true };
  };

  // Validate form đầy đủ (cho trang cuối cùng khi submit)
  const validateFormFull = (): { isValid: boolean; error?: string } => {
    const basicValidation = validateForm();
    if (!basicValidation.isValid) {
      return basicValidation;
    }
    
    if (formData.rooms.length === 0) {
      return { isValid: false, error: 'Vui lòng thêm ít nhất một phòng' };
    }
    
    // Validate rooms
    for (const room of formData.rooms) {
      if (room.quantity < 1) {
        return { isValid: false, error: 'Số lượng phòng phải lớn hơn 0' };
      }
      if (room.pricePerNight < 0) {
        return { isValid: false, error: 'Giá mỗi đêm phải lớn hơn hoặc bằng 0' };
      }
      if (room.roomNames.length !== room.quantity) {
        return {
          isValid: false,
          error: `Vui lòng nhập đầy đủ tên cho ${room.quantity} phòng loại ${room.type}`,
        };
      }
      // Validate từng tên phòng không được trống
      for (let i = 0; i < room.roomNames.length; i++) {
        if (!room.roomNames[i] || room.roomNames[i].trim().length === 0) {
          return {
            isValid: false,
            error: `Vui lòng nhập tên cho phòng ${i + 1} loại ${room.type}`,
          };
        }
      }
    }
    return { isValid: true };
  };

  return {
    formData,
    imageUris,
    updateField,
    updateAddress,
    updateImages,
    removeImage,
    updateRooms,
    updateRoomGroup,
    addRoomGroup,
    removeRoomGroup,
    updateAmenities,
    toggleAmenity,
    resetForm,
    validateForm,
    validateFormFull,
  };
}


