import React, { createContext, useContext, useState, ReactNode } from 'react';
import { HomestayFormData, Address, RoomGroup, AMENITIES } from '@/types/homestay';
import { getHomestayImageUrl } from '@/services/api';
import { normalizeAmenitiesFromDB } from '@/utils/homestayValidation';

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

interface HomestayFormContextType {
  formData: HomestayFormData;
  imageUris: string[];
  updateField: <K extends keyof HomestayFormData>(
    field: K,
    value: HomestayFormData[K]
  ) => void;
  updateAddress: (address: Address) => void;
  updateImages: (images: string[], uris: string[]) => void;
  removeImage: (index: number) => void;
  updateRooms: (rooms: RoomGroup[]) => void;
  updateRoomGroup: (index: number, roomGroup: Partial<RoomGroup>) => void;
  addRoomGroup: (roomGroup: RoomGroup) => void;
  removeRoomGroup: (index: number) => void;
  updateAmenities: (amenities: string[]) => void;
  toggleAmenity: (amenity: string) => void;
  resetForm: () => void;
  loadHomestayData: (homestay: any) => void;
  validateForm: () => { isValid: boolean; error?: string };
  validateFormFull: () => { isValid: boolean; error?: string };
}

const HomestayFormContext = createContext<HomestayFormContextType | undefined>(undefined);

export function HomestayFormProvider({ children }: { children: ReactNode }) {
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

  const loadHomestayData = (homestay: any) => {
    // Group rooms by type
    const roomGroups: RoomGroup[] = [];
    if (homestay.rooms && homestay.rooms.length > 0) {
      const roomsByType: { [key: string]: any[] } = {};
      homestay.rooms.forEach((room: any) => {
        if (!roomsByType[room.type]) {
          roomsByType[room.type] = [];
        }
        roomsByType[room.type].push(room);
      });

      Object.keys(roomsByType).forEach((type) => {
        const rooms = roomsByType[type];
        const roomGroup: RoomGroup = {
          type: type as any,
          quantity: rooms.length,
          pricePerNight: rooms[0].pricePerNight,
          roomNames: rooms.map((r: any) => r.name),
        };
        roomGroups.push(roomGroup);
      });
    }

    const imageUrls = homestay.images || [];
    // Xử lý images: nếu là URLs từ server, giữ nguyên để hiển thị
    // Nếu là base64, cũng giữ nguyên
    // imageUris sẽ dùng để hiển thị (có thể là URLs hoặc local URIs)
    // images sẽ dùng để gửi lên server (có thể là URLs hoặc base64)
    const imageUrisForDisplay = imageUrls.map((img: string) => {
      // Nếu là URL từ server, dùng luôn
      if (img.startsWith('http') || img.startsWith('https')) {
        return img;
      }
      // Nếu là base64, dùng luôn
      if (img.startsWith('data:image')) {
        return img;
      }
      // Nếu là relative path, convert sang full URL
      const fullUrl = getHomestayImageUrl(img);
      return fullUrl || img;
    });

    // Normalize amenities từ DB (lowercase) về format của AMENITIES constant
    const normalizedAmenities = normalizeAmenitiesFromDB(
      homestay.amenities || [],
      AMENITIES
    );

    setFormData({
      name: homestay.name || '',
      description: homestay.description || '',
      address: homestay.address || initialFormData.address,
      googleMapsEmbed: homestay.googleMapsEmbed || '',
      pricePerNight: homestay.pricePerNight?.toString() || '',
      images: imageUrls, // Giữ nguyên URLs hoặc base64
      featured: homestay.featured || false,
      requireDeposit: homestay.requireDeposit || false,
      rooms: roomGroups,
      amenities: normalizedAmenities,
    });
    setImageUris(imageUrisForDisplay);
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
      // Loại bỏ duplicate trước khi toggle
      const uniqueAmenities = Array.from(new Set(prev.amenities));
      const isSelected = uniqueAmenities.includes(amenity);
      return {
        ...prev,
        amenities: isSelected
          ? uniqueAmenities.filter((a) => a !== amenity)
          : [...uniqueAmenities, amenity],
      };
    });
  };

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

  const validateFormFull = (): { isValid: boolean; error?: string } => {
    const basicValidation = validateForm();
    if (!basicValidation.isValid) {
      return basicValidation;
    }
    
    if (formData.rooms.length === 0) {
      return { isValid: false, error: 'Vui lòng thêm ít nhất một phòng' };
    }
    
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

  return (
    <HomestayFormContext.Provider
      value={{
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
        loadHomestayData,
        validateForm,
        validateFormFull,
      }}
    >
      {children}
    </HomestayFormContext.Provider>
  );
}

export function useHomestayForm() {
  const context = useContext(HomestayFormContext);
  if (context === undefined) {
    throw new Error('useHomestayForm must be used within a HomestayFormProvider');
  }
  return context;
}

