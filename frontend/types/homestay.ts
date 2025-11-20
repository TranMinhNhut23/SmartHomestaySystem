export interface Province {
  code: string;
  name: string;
  districts: District[];
}

export interface District {
  code: string;
  name: string;
  wards: Ward[];
}

export interface Ward {
  code: string;
  name: string;
}

export interface Address {
  province: { code: string; name: string };
  district: { code: string; name: string };
  ward: { code: string; name: string };
  street: string;
}

export type RoomType = 'single' | 'double' | 'twin' | 'triple' | 'standard' | 'deluxe';

export interface RoomTypeInfo {
  type: RoomType;
  label: string;
  description: string;
}

export interface RoomGroup {
  type: RoomType;
  quantity: number;
  pricePerNight: number;
  roomNames: string[];
}

export interface HomestayFormData {
  name: string;
  description: string;
  address: Address;
  googleMapsEmbed: string;
  pricePerNight: string;
  images: string[];
  featured: boolean;
  requireDeposit: boolean;
  rooms: RoomGroup[];
  amenities: string[];
}

export interface DropdownOption {
  code: string;
  name: string;
}

export const ROOM_TYPES: RoomTypeInfo[] = [
  {
    type: 'single',
    label: 'Single',
    description: 'Phòng đơn dành cho 1 người, thường có 1 giường đơn.',
  },
  {
    type: 'double',
    label: 'Double',
    description: 'Phòng đôi dành cho 2 người, có 1 giường đôi hoặc 2 giường đơn.',
  },
  {
    type: 'twin',
    label: 'Twin',
    description: 'Phòng có 2 giường đơn, phù hợp cho 2 người.',
  },
  {
    type: 'triple',
    label: 'Triple',
    description: 'Phòng dành cho 3 người với 3 giường hoặc 1 giường đôi + 1 đơn.',
  },
  {
    type: 'standard',
    label: 'Standard',
    description: 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản.',
  },
  {
    type: 'deluxe',
    label: 'Deluxe',
    description: 'Phòng cao cấp với không gian rộng rãi và tiện nghi nâng cao.',
  },
];

export const AMENITIES = [
  'Wi-Fi miễn phí',
  'Máy lạnh',
  'Tivi',
  'Máy giặt',
  'Tủ lạnh',
  'Bếp nấu ăn',
  'Bãi đậu xe miễn phí',
  'Hồ bơi',
  'Ban công',
  'Bồn tắm',
  'Vòi sen',
  'Bình nóng lạnh',
  'Bàn làm việc',
  'Máy sấy tóc',
  'Camera an ninh',
  'Bảo vệ 24/7',
  'Thang máy',
  'View biển',
  'Cho phép vật nuôi',
  'Phù hợp gia đình',
];


