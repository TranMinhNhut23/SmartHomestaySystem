import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useBooking } from '@/contexts/BookingContext';
import { apiService, getHomestayImageUrl } from '@/services/api';
import { ROOM_TYPES } from '@/types/homestay';

interface Homestay {
  _id: string;
  name: string;
  address: {
    province: { name: string };
    district: { name: string };
    ward: { name: string };
    street: string;
  };
  images: string[];
}

interface Room {
  _id: string;
  type: string;
  name: string;
  pricePerNight: number;
  maxGuests: number;
  status: string;
}

export default function BookingScreen() {
  const { 
    homestayId, 
    roomId, 
    roomName,
    roomType,
    roomPricePerNight,
    roomMaxGuests,
    checkIn: checkInParam, 
    checkOut: checkOutParam 
  } = useLocalSearchParams<{ 
    homestayId: string; 
    roomId?: string;
    roomName?: string;
    roomType?: string;
    roomPricePerNight?: string;
    roomMaxGuests?: string;
    checkIn?: string;
    checkOut?: string;
  }>();
  const { user, isAuthenticated } = useAuth();
  const { createBooking } = useBooking();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [homestay, setHomestay] = useState<Homestay | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isPreSelected, setIsPreSelected] = useState(false); // Đánh dấu nếu phòng đã được chọn từ homestay-detail

  // Date picker states
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState<Date | null>(null);
  const [tempCheckOut, setTempCheckOut] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Form data
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [guestInfo, setGuestInfo] = useState({
    fullName: user?.username || '',
    phone: user?.phone || '',
    email: user?.email || '',
    specialRequests: '',
  });
  const [isEditingGuestInfo, setIsEditingGuestInfo] = useState(false);
  const [originalGuestInfo, setOriginalGuestInfo] = useState({
    fullName: user?.username || '',
    phone: user?.phone || '',
    email: user?.email || '',
    specialRequests: '',
  });

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    name: string;
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  
  // Coupon list modal states
  const [showCouponList, setShowCouponList] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Array<{
    _id: string;
    name: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscount?: number;
    minOrder?: number;
    startDate: string;
    endDate: string;
    isValid: boolean;
    reason?: string;
  }>>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đặt phòng', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }

    if (homestayId) {
      loadHomestayData();
    }

    // Load thông tin user đầy đủ
    loadUserInfo();
  }, [homestayId, isAuthenticated]);

  // Load thông tin user đầy đủ từ API
  const loadUserInfo = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiService.getCurrentUser();
      if (response.success && response.data) {
        const userData = response.data;
        const updatedGuestInfo = {
          fullName: userData.username || '',
          phone: userData.phone || '',
          email: userData.email || '',
          specialRequests: guestInfo.specialRequests || '', // Giữ lại specialRequests nếu đã có
        };
        setGuestInfo(updatedGuestInfo);
        setOriginalGuestInfo(updatedGuestInfo);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      // Nếu lỗi, vẫn dùng thông tin từ user context
      const fallbackGuestInfo = {
        fullName: user?.username || '',
        phone: user?.phone || '',
        email: user?.email || '',
        specialRequests: guestInfo.specialRequests || '',
      };
      setGuestInfo(fallbackGuestInfo);
      setOriginalGuestInfo(fallbackGuestInfo);
    }
  };

  // Set checkIn and checkOut from params if provided
  useEffect(() => {
    if (checkInParam) {
      setCheckIn(checkInParam);
    }
    if (checkOutParam) {
      setCheckOut(checkOutParam);
    }
  }, [checkInParam, checkOutParam]);

  // Set pre-selected room if provided from params
  useEffect(() => {
    if (roomId && roomType && roomName && roomPricePerNight) {
      setIsPreSelected(true);
      setSelectedRoomType(roomType);
      // Create a room object from params
      const preSelectedRoom: Room = {
        _id: roomId,
        name: roomName,
        type: roomType,
        pricePerNight: parseFloat(roomPricePerNight),
        maxGuests: roomMaxGuests ? parseInt(roomMaxGuests) : 2, // Use from params or default to 2
        status: 'available',
      };
      setSelectedRoom(preSelectedRoom);
      setNumberOfGuests(preSelectedRoom.maxGuests); // Set number of guests immediately
    }
  }, [roomId, roomType, roomName, roomPricePerNight, roomMaxGuests]);

  useEffect(() => {
    if (roomId && rooms.length > 0 && !isPreSelected) {
      const room = rooms.find((r) => r._id === roomId);
      if (room) {
        setSelectedRoomType(room.type);
        setSelectedRoom(room);
        setNumberOfGuests(room.maxGuests);
      }
    } else if (isPreSelected && rooms.length > 0 && selectedRoom) {
      // Update pre-selected room with full info from loaded rooms
      const fullRoomInfo = rooms.find((r) => r._id === selectedRoom._id);
      if (fullRoomInfo) {
        setSelectedRoom(fullRoomInfo);
        setNumberOfGuests(fullRoomInfo.maxGuests);
      }
    }
  }, [roomId, rooms, isPreSelected, selectedRoom]);

  // Kiểm tra availability khi có checkIn và checkOut (chỉ khi không phải pre-selected)
  useEffect(() => {
    if (checkIn && checkOut && rooms.length > 0 && !isPreSelected) {
      checkRoomsAvailability();
    } else if (!isPreSelected) {
      // Nếu chưa chọn ngày và không phải pre-selected, reset available rooms và selected room
      setAvailableRooms([]);
      setSelectedRoomType(null);
      setSelectedRoom(null);
    }
  }, [checkIn, checkOut, rooms, isPreSelected]);

  // Reset selected room type khi thay đổi checkIn/checkOut (chỉ khi không phải pre-selected)
  useEffect(() => {
    if ((!checkIn || !checkOut) && !isPreSelected) {
      setSelectedRoomType(null);
      setSelectedRoom(null);
    }
  }, [checkIn, checkOut, isPreSelected]);

  const loadHomestayData = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getHomestayById(homestayId!);
      if (response.success && response.data) {
        setHomestay(response.data);
        const allRooms = response.data.rooms || [];
        setRooms(allRooms);
        // Ban đầu hiển thị tất cả phòng available
        setAvailableRooms(allRooms.filter((room: Room) => room.status === 'available'));
        
        // Auto select room if roomId provided
        if (roomId && allRooms.length > 0) {
          const room = allRooms.find((r: Room) => r._id === roomId);
          if (room) {
            setSelectedRoom(room);
          }
        }
      } else {
        throw new Error(response.message || 'Không thể tải thông tin homestay');
      }
    } catch (error: any) {
      console.error('Error loading homestay:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin homestay', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkRoomsAvailability = async () => {
    if (!checkIn || !checkOut) return;

    try {
      setIsCheckingAvailability(true);
      const available: Room[] = [];

      // Kiểm tra từng phòng
      for (const room of rooms.filter((r) => r.status === 'available')) {
        try {
          const response = await apiService.checkRoomAvailability(room._id, checkIn, checkOut);
          if (response.success && response.data?.available) {
            available.push(room);
          }
        } catch (error) {
          console.error(`Error checking availability for room ${room._id}:`, error);
          // Nếu lỗi, vẫn thêm phòng vào danh sách (fallback)
          available.push(room);
        }
      }

      setAvailableRooms(available);
      
      // Nếu có roomId từ params và phòng đó còn available, tự động chọn
      if (roomId && !selectedRoom) {
        const roomFromParams = available.find((r) => r._id === roomId);
        if (roomFromParams) {
          setSelectedRoom(roomFromParams);
          setSelectedRoomType(roomFromParams.type);
          setNumberOfGuests(roomFromParams.maxGuests);
        }
      }
      
      // Nếu phòng đã chọn không còn available, bỏ chọn
      if (selectedRoom && !available.find((r) => r._id === selectedRoom._id)) {
        setSelectedRoom(null);
        setSelectedRoomType(null);
      }
      
      // Nếu loại phòng đã chọn không còn phòng available, bỏ chọn loại phòng
      if (selectedRoomType && !available.find((r) => r.type === selectedRoomType)) {
        setSelectedRoomType(null);
        setSelectedRoom(null);
      }
    } catch (error) {
      console.error('Error checking rooms availability:', error);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateFull = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = days[date.getDay()];
    return `${dayName}, ${date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`;
  };

  const getDateInfo = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      dayName: days[date.getDay()],
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      fullDate: formatDateFull(dateString),
    };
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return firstDay.getDay();
  };

  const getCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handleCalendarDateSelect = (day: number, type: 'checkIn' | 'checkOut') => {
    const selectedDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    if (type === 'checkIn') {
      setTempCheckIn(selectedDate);
      handleDateSelect('checkIn', selectedDate);
      setShowCheckInPicker(false);
    } else {
      if (checkIn && selectedDate <= new Date(checkIn)) {
        Alert.alert('Lỗi', 'Ngày trả phòng phải sau ngày nhận phòng');
        return;
      }
      setTempCheckOut(selectedDate);
      handleDateSelect('checkOut', selectedDate);
      setShowCheckOutPicker(false);
    }
  };

  const changeCalendarMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(calendarMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCalendarMonth(newMonth);
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (type: 'checkIn' | 'checkOut', date: Date) => {
    const dateString = formatDateForInput(date);
    
    if (type === 'checkIn') {
      setCheckIn(dateString);
      setShowCheckInPicker(false);
      
      // Nếu checkOut trước checkIn, reset checkOut
      if (checkOut && new Date(checkOut) <= date) {
        setCheckOut('');
        setSelectedRoom(null);
      }
    } else {
      // Validate checkOut phải sau checkIn
      if (checkIn && date <= new Date(checkIn)) {
        Alert.alert('Lỗi', 'Ngày trả phòng phải sau ngày nhận phòng');
        return;
      }
      setCheckOut(dateString);
      setShowCheckOutPicker(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const getRoomTypeLabel = (type: string) => {
    const roomType = ROOM_TYPES.find((rt) => rt.type === type);
    return roomType?.label || type;
  };

  // Group rooms theo type
  const getAvailableRoomTypes = () => {
    const types = new Set(availableRooms.map((room) => room.type));
    return Array.from(types).map((type) => {
      const roomTypeInfo = ROOM_TYPES.find((rt) => rt.type === type);
      const roomsOfType = availableRooms.filter((r) => r.type === type);
      const minPrice = Math.min(...roomsOfType.map((r) => r.pricePerNight));
      const maxGuests = roomsOfType[0]?.maxGuests || 2;
      
      return {
        type,
        label: roomTypeInfo?.label || type,
        description: roomTypeInfo?.description || '',
        count: roomsOfType.length,
        minPrice,
        maxGuests,
      };
    });
  };

  // Lấy danh sách phòng theo loại đã chọn
  const getRoomsBySelectedType = () => {
    if (!selectedRoomType) return [];
    return availableRooms.filter((room) => room.type === selectedRoomType);
  };

  // Xử lý chọn loại phòng
  const handleSelectRoomType = (type: string) => {
    setSelectedRoomType(type);
    setSelectedRoom(null);
    const roomsOfType = availableRooms.filter((r) => r.type === type);
    if (roomsOfType.length > 0) {
      setNumberOfGuests(roomsOfType[0].maxGuests);
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedRoom || !checkIn || !checkOut) return 0;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const originalPrice = selectedRoom.pricePerNight * diffDays;
    
    // Áp dụng discount từ coupon nếu có
    if (appliedCoupon) {
      return originalPrice - appliedCoupon.discountAmount;
    }

    return originalPrice;
  };

  const calculateOriginalPrice = () => {
    if (!selectedRoom || !checkIn || !checkOut) return 0;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return selectedRoom.pricePerNight * diffDays;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã giảm giá');
      return;
    }

    if (!selectedRoom || !checkIn || !checkOut) {
      Alert.alert('Lỗi', 'Vui lòng chọn phòng và ngày trước khi áp dụng mã giảm giá');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const originalPrice = calculateOriginalPrice();
      const response = await apiService.validateCoupon(
        couponCode.trim().toUpperCase(),
        originalPrice,
        homestayId
      );

      if (response.success && response.data) {
        setAppliedCoupon({
          name: response.data.coupon.name,
          code: response.data.coupon.code,
          discountType: response.data.coupon.discountType,
          discountValue: response.data.coupon.discountValue,
          discountAmount: response.data.discountAmount,
        });
        setCouponCode(response.data.coupon.code); // Lưu code đã format
        Alert.alert('Thành công', `Đã áp dụng mã giảm giá "${response.data.coupon.name}"`);
      } else {
        throw new Error(response.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      setCouponError(error.message || 'Mã giảm giá không hợp lệ');
      Alert.alert('Lỗi', error.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const loadAvailableCoupons = async () => {
    try {
      setIsLoadingCoupons(true);
      console.log('Loading coupons...');
      const response = await apiService.getActiveCoupons();
      console.log('Coupons API response:', response);
      
      if (response && response.success && response.data) {
        const coupons = Array.isArray(response.data) ? response.data : [];
        console.log('Number of coupons received:', coupons.length);
        
        if (coupons.length === 0) {
          console.log('No coupons available');
          setAvailableCoupons([]);
          return;
        }
        
        const originalPrice = calculateOriginalPrice();
        console.log('Original price for validation:', originalPrice);
        
        // Kiểm tra tính khả dụng của từng coupon
        const couponsWithValidity = await Promise.all(
          coupons.map(async (coupon: any) => {
            let isValid = true;
            let reason = '';
            
            try {
              // Kiểm tra minOrder
              if (coupon.minOrder && originalPrice < coupon.minOrder) {
                isValid = false;
                reason = `Đơn hàng tối thiểu ${formatPrice(coupon.minOrder)} VNĐ`;
                return {
                  ...coupon,
                  isValid,
                  reason,
                };
              }
              
              // Kiểm tra thời gian hiệu lực (client-side check)
              const now = new Date();
              const startDate = new Date(coupon.startDate);
              const endDate = new Date(coupon.endDate);
              
              if (startDate > now) {
                isValid = false;
                reason = 'Mã giảm giá chưa có hiệu lực';
                return {
                  ...coupon,
                  isValid,
                  reason,
                };
              }
              
              if (endDate < now) {
                isValid = false;
                reason = 'Mã giảm giá đã hết hạn';
                return {
                  ...coupon,
                  isValid,
                  reason,
                };
              }
              
              // Nếu hợp lệ, kiểm tra bằng validateCoupon (nếu có user đăng nhập và có homestayId)
              if (isValid && isAuthenticated && user && homestayId) {
                try {
                  const validateResponse = await apiService.validateCoupon(
                    coupon.code,
                    originalPrice,
                    homestayId
                  );
                  if (!validateResponse.success) {
                    isValid = false;
                    reason = validateResponse.message || 'Không thể áp dụng';
                  }
                } catch (error: any) {
                  // Nếu validate fail, đánh dấu là không hợp lệ và lưu lý do
                  isValid = false;
                  reason = error.message || 'Không thể áp dụng cho homestay này';
                  console.warn(`Coupon ${coupon.code} validation error:`, error);
                }
              } else if (isValid && !homestayId) {
                // Nếu chưa có homestayId, vẫn hiển thị coupon nhưng sẽ validate khi chọn
                // Không đánh dấu là invalid, chỉ validate khi user chọn
              }
            } catch (error: any) {
              console.error(`Error processing coupon ${coupon.code}:`, error);
              // Vẫn hiển thị coupon, sẽ validate khi chọn
            }
            
            return {
              ...coupon,
              isValid,
              reason: isValid ? undefined : reason,
            };
          })
        );
        
        console.log('Processed coupons:', couponsWithValidity.length);
        setAvailableCoupons(couponsWithValidity);
      } else {
        console.log('Invalid response format:', response);
        setAvailableCoupons([]);
        if (response && !response.success) {
          Alert.alert('Lỗi', response.message || 'Không thể tải danh sách mã giảm giá');
        }
      }
    } catch (error: any) {
      console.error('Error loading coupons:', error);
      setAvailableCoupons([]);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách mã giảm giá');
    } finally {
      setIsLoadingCoupons(false);
    }
  };

  const handleOpenCouponList = () => {
    if (!selectedRoom || !checkIn || !checkOut) {
      Alert.alert('Thông báo', 'Vui lòng chọn phòng và ngày trước khi xem mã giảm giá');
      return;
    }
    setShowCouponList(true);
    loadAvailableCoupons();
  };

  const handleSelectCoupon = async (coupon: typeof availableCoupons[0]) => {
    if (!coupon.isValid) {
      Alert.alert('Thông báo', coupon.reason || 'Mã giảm giá này không thể sử dụng');
      return;
    }
    
    setCouponCode(coupon.code);
    setShowCouponList(false);
    
    // Tự động áp dụng coupon
    setIsApplyingCoupon(true);
    setCouponError(null);
    
    try {
      const originalPrice = calculateOriginalPrice();
      const response = await apiService.validateCoupon(
        coupon.code,
        originalPrice,
        homestayId
      );

      if (response.success && response.data) {
        setAppliedCoupon({
          name: response.data.coupon.name,
          code: response.data.coupon.code,
          discountType: response.data.coupon.discountType,
          discountValue: response.data.coupon.discountValue,
          discountAmount: response.data.discountAmount,
        });
        setCouponCode(response.data.coupon.code);
        Alert.alert('Thành công', `Đã áp dụng mã giảm giá "${response.data.coupon.name}"`);
      } else {
        throw new Error(response.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error: any) {
      console.error('Error applying coupon:', error);
      setCouponError(error.message || 'Mã giảm giá không hợp lệ');
      Alert.alert('Lỗi', error.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRoom) {
      Alert.alert('Lỗi', 'Vui lòng chọn phòng');
      return;
    }

    if (!checkIn || !checkOut) {
      Alert.alert('Lỗi', 'Vui lòng chọn ngày nhận phòng và trả phòng');
      return;
    }

    if (!numberOfGuests || numberOfGuests < 1) {
      Alert.alert('Lỗi', 'Số lượng khách không hợp lệ');
      return;
    }

    if (!guestInfo.fullName || !guestInfo.phone || !guestInfo.email) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin khách hàng');
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      Alert.alert('Lỗi', 'Ngày nhận phòng không được trong quá khứ');
      return;
    }

    if (checkOutDate <= checkInDate) {
      Alert.alert('Lỗi', 'Ngày trả phòng phải sau ngày nhận phòng');
      return;
    }

    // Chuyển đến trang xác nhận và thanh toán
    const bookingData = {
      homestayId: homestayId!,
      roomId: selectedRoom._id,
      checkIn,
      checkOut,
      numberOfGuests: numberOfGuests,
      guestInfo,
      totalPrice: totalPrice,
      originalPrice: calculateOriginalPrice(),
      discountAmount: appliedCoupon?.discountAmount || 0,
      couponCode: appliedCoupon?.code && appliedCoupon.code.trim() ? appliedCoupon.code.trim() : null,
      homestay: homestay,
      room: selectedRoom,
    };
    
    router.push({
      pathname: '/booking-confirm',
      params: {
        bookingData: JSON.stringify(bookingData),
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.loadingText}>Đang tải...</ThemedText>
      </View>
    );
  }

  if (!homestay) {
    return null;
  }

  const totalPrice = calculateTotalPrice();
  const numberOfNights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8', '#10a5c7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Đặt Phòng</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <ThemedText style={styles.stepNumber}>1</ThemedText>
            </View>
            <ThemedText style={[styles.stepLabel, styles.stepLabelActive]}>Chọn phòng & Ngày</ThemedText>
          </View>
          <View style={[styles.stepLine, styles.stepLineInactive]} />
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, styles.stepCircleInactive]}>
              <ThemedText style={styles.stepNumberInactive}>2</ThemedText>
            </View>
            <ThemedText style={[styles.stepLabel, styles.stepLabelInactive]}>Xác nhận</ThemedText>
          </View>
          <View style={[styles.stepLine, styles.stepLineInactive]} />
          <View style={styles.stepContainer}>
            <View style={[styles.stepCircle, styles.stepCircleInactive]}>
              <ThemedText style={styles.stepNumberInactive}>3</ThemedText>
            </View>
            <ThemedText style={[styles.stepLabel, styles.stepLabelInactive]}>Thanh toán</ThemedText>
          </View>
        </View>

        {/* Homestay Info */}
        <View style={styles.homestayCard}>
          <ThemedText style={styles.homestayName}>{homestay.name}</ThemedText>
          <ThemedText style={styles.homestayAddress}>
            {homestay.address.street}, {homestay.address.ward.name}, {homestay.address.district.name}, {homestay.address.province.name}
          </ThemedText>
        </View>

        {/* Select Room */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bed-outline" size={24} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>
              {isPreSelected ? 'Thông Tin Phòng Đã Chọn' : 'Chọn Phòng'}
            </ThemedText>
            {isCheckingAvailability && !isPreSelected && (
              <ActivityIndicator size="small" color="#0a7ea4" style={styles.loadingIndicator} />
            )}
          </View>
          
          {/* Pre-selected Room Display */}
          {isPreSelected && selectedRoom && checkIn && checkOut && (
            <View style={styles.preSelectedRoomCard}>
              <View style={styles.preSelectedRoomHeader}>
                <View style={styles.preSelectedRoomIconContainer}>
                  <Ionicons name="bed" size={24} color="#0a7ea4" />
                </View>
                <View style={styles.preSelectedRoomInfo}>
                  <ThemedText style={styles.preSelectedRoomName}>{selectedRoom.name}</ThemedText>
                  <ThemedText style={styles.preSelectedRoomType}>
                    {getRoomTypeLabel(selectedRoom.type)}
                  </ThemedText>
                </View>
                <View style={styles.preSelectedRoomBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <ThemedText style={styles.preSelectedRoomBadgeText}>Đã chọn</ThemedText>
                </View>
              </View>
              <View style={styles.preSelectedRoomDetails}>
                <View style={styles.preSelectedRoomDetailItem}>
                  <Ionicons name="cash" size={16} color="#0a7ea4" />
                  <ThemedText style={styles.preSelectedRoomDetailText}>
                    {formatPrice(selectedRoom.pricePerNight)} VNĐ/đêm
                  </ThemedText>
                </View>
                <View style={styles.preSelectedRoomDetailItem}>
                  <Ionicons name="people" size={16} color="#64748b" />
                  <ThemedText style={styles.preSelectedRoomDetailText}>
                    Tối đa {selectedRoom.maxGuests} khách
                  </ThemedText>
                </View>
                <View style={styles.preSelectedRoomDetailItem}>
                  <Ionicons name="calendar" size={16} color="#64748b" />
                  <ThemedText style={styles.preSelectedRoomDetailText}>
                    {formatDate(checkIn)} → {formatDate(checkOut)}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {(!checkIn || !checkOut) && !isPreSelected && (
            <View style={styles.hintContainer}>
              <Ionicons name="information-circle" size={16} color="#0a7ea4" />
              <ThemedText style={styles.hintText}>
                Vui lòng chọn ngày nhận phòng và trả phòng để xem phòng còn trống
              </ThemedText>
            </View>
          )}
          {checkIn && checkOut && availableRooms.length === 0 && !isPreSelected && (
            <View style={styles.noRoomsMessage}>
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              <ThemedText style={styles.noRoomsText}>
                Không có phòng trống trong khoảng thời gian từ {formatDate(checkIn)} đến {formatDate(checkOut)}
              </ThemedText>
            </View>
          )}
          {checkIn && checkOut && availableRooms.length > 0 && !selectedRoomType && !isPreSelected && (
            <>
              <ThemedText style={styles.subSectionTitle}>Bước 1: Chọn loại phòng</ThemedText>
              <View style={styles.roomTypesList}>
                {getAvailableRoomTypes().map((roomType) => (
                  <TouchableOpacity
                    key={roomType.type}
                    style={styles.roomTypeCard}
                    onPress={() => handleSelectRoomType(roomType.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomTypeHeader}>
                      <ThemedText style={styles.roomTypeName}>{roomType.label}</ThemedText>
                      <View style={styles.roomTypeInfo}>
                        <Ionicons name="people" size={14} color="#0a7ea4" />
                        <ThemedText style={styles.roomTypeGuests}>{roomType.maxGuests} khách</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.roomTypeDescription}>{roomType.description}</ThemedText>
                    <View style={styles.roomTypeFooter}>
                      <ThemedText style={styles.roomTypeCount}>
                        {roomType.count} phòng có sẵn
                      </ThemedText>
                      <ThemedText style={styles.roomTypePrice}>
                        Từ {formatPrice(roomType.minPrice)} VNĐ/đêm
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {checkIn && checkOut && selectedRoomType && (
            <>
              <View style={styles.selectedRoomTypeHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedRoomType(null);
                    setSelectedRoom(null);
                  }}
                  style={styles.backToTypesButton}
                >
                  <Ionicons name="arrow-back" size={18} color="#0a7ea4" />
                  <ThemedText style={styles.backToTypesText}>Chọn lại loại phòng</ThemedText>
                </TouchableOpacity>
                <ThemedText style={styles.subSectionTitle}>
                  Bước 2: Chọn phòng {getRoomTypeLabel(selectedRoomType)}
                </ThemedText>
              </View>
              <View style={styles.roomsList}>
                {getRoomsBySelectedType().map((room) => (
                  <TouchableOpacity
                    key={room._id}
                    style={[
                      styles.roomCard,
                      selectedRoom?._id === room._id && styles.roomCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedRoom(room);
                      setNumberOfGuests(room.maxGuests);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomHeader}>
                      <ThemedText style={styles.roomName}>{room.name}</ThemedText>
                      <View style={styles.roomTypeBadge}>
                        <ThemedText style={styles.roomTypeText}>
                          {getRoomTypeLabel(room.type)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.roomPriceRow}>
                      <Ionicons name="cash" size={16} color="#0a7ea4" />
                      <ThemedText style={styles.roomPrice}>
                        {formatPrice(room.pricePerNight)} VNĐ/đêm
                      </ThemedText>
                    </View>
                    <View style={styles.roomGuestsRow}>
                      <Ionicons name="people" size={16} color="#64748b" />
                      <ThemedText style={styles.roomGuests}>
                        Tối đa {room.maxGuests} khách
                      </ThemedText>
                    </View>
                    {selectedRoom?._id === room._id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={24} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>Ngày Nhận/Trả Phòng</ThemedText>
            {isPreSelected && (
              <View style={styles.lockedIndicator}>
                <Ionicons name="lock-closed" size={14} color="#64748b" />
                <ThemedText style={styles.lockedText}>Đã khóa</ThemedText>
              </View>
            )}
          </View>
          
          <View style={styles.dateSelectionContainer}>
            {/* Check In */}
            <TouchableOpacity
              style={[
                styles.dateCard, 
                checkIn && styles.dateCardSelected,
                isPreSelected && styles.dateCardLocked
              ]}
              onPress={() => {
                if (isPreSelected) return; // Disable if pre-selected
                const today = new Date();
                const initialDate = checkIn ? new Date(checkIn) : today;
                setTempCheckIn(initialDate);
                setCalendarMonth(initialDate);
                setShowCheckInPicker(true);
              }}
              activeOpacity={isPreSelected ? 1 : 0.7}
              disabled={isPreSelected}
            >
              <View style={styles.dateCardHeader}>
                <Ionicons name="log-in-outline" size={16} color={checkIn ? "#0a7ea4" : "#94a3b8"} />
                <ThemedText style={[styles.dateCardLabel, checkIn && styles.dateCardLabelSelected]} numberOfLines={1}>
                  Nhận phòng
                </ThemedText>
              </View>
              {checkIn ? (
                <View style={styles.dateCardContent}>
                  <ThemedText style={styles.dateCardDay}>{getDateInfo(checkIn)?.day}</ThemedText>
                  <View style={styles.dateCardInfo}>
                    <ThemedText style={styles.dateCardMonth}>
                      Tháng {getDateInfo(checkIn)?.month}/{getDateInfo(checkIn)?.year}
                    </ThemedText>
                    <ThemedText style={styles.dateCardDayName}>{getDateInfo(checkIn)?.dayName}</ThemedText>
                  </View>
                </View>
              ) : (
                <ThemedText style={styles.dateCardPlaceholder}>Chọn ngày</ThemedText>
              )}
            </TouchableOpacity>

            {/* Arrow */}
            <View style={styles.dateArrow}>
              <Ionicons name="arrow-forward" size={24} color="#cbd5e1" />
              {checkIn && checkOut && (
                <ThemedText style={styles.dateNights}>
                  {numberOfNights} đêm
                </ThemedText>
              )}
            </View>

            {/* Check Out */}
            <TouchableOpacity
              style={[
                styles.dateCard,
                checkOut && styles.dateCardSelected,
                (!checkIn || isPreSelected) && styles.dateCardDisabled,
                isPreSelected && styles.dateCardLocked
              ]}
              onPress={() => {
                if (isPreSelected) return; // Disable if pre-selected
                if (!checkIn) {
                  Alert.alert('Thông báo', 'Vui lòng chọn ngày nhận phòng trước');
                  return;
                }
                const minDate = new Date(checkIn);
                minDate.setDate(minDate.getDate() + 1);
                const initialDate = checkOut ? new Date(checkOut) : minDate;
                setTempCheckOut(initialDate);
                setCalendarMonth(initialDate);
                setShowCheckOutPicker(true);
              }}
              activeOpacity={isPreSelected ? 1 : 0.7}
              disabled={!checkIn || isPreSelected}
            >
              <View style={styles.dateCardHeader}>
                <Ionicons name="log-out-outline" size={16} color={checkOut ? "#0a7ea4" : "#94a3b8"} />
                <ThemedText style={[styles.dateCardLabel, checkOut && styles.dateCardLabelSelected]} numberOfLines={1}>
                  Trả phòng
                </ThemedText>
              </View>
              {checkOut ? (
                <View style={styles.dateCardContent}>
                  <ThemedText style={styles.dateCardDay}>{getDateInfo(checkOut)?.day}</ThemedText>
                  <View style={styles.dateCardInfo}>
                    <ThemedText style={styles.dateCardMonth}>
                      Tháng {getDateInfo(checkOut)?.month}/{getDateInfo(checkOut)?.year}
                    </ThemedText>
                    <ThemedText style={styles.dateCardDayName}>{getDateInfo(checkOut)?.dayName}</ThemedText>
                  </View>
                </View>
              ) : (
                <ThemedText style={styles.dateCardPlaceholder}>Chọn ngày</ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Date Summary */}
          {checkIn && checkOut && (
            <View style={styles.dateSummary}>
              <View style={styles.dateSummaryRow}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <ThemedText style={styles.dateSummaryText}>
                  {formatDateFull(checkIn)} → {formatDateFull(checkOut)}
                </ThemedText>
              </View>
              <View style={styles.dateSummaryRow}>
                <Ionicons name="moon-outline" size={16} color="#64748b" />
                <ThemedText style={styles.dateSummaryText}>
                  Tổng cộng: {numberOfNights} đêm
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Date Picker Modals */}
        <Modal
          visible={showCheckInPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCheckInPicker(false)}
        >
          <View style={styles.datePickerModal}>
            <TouchableOpacity
              style={styles.datePickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowCheckInPicker(false)}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Ionicons name="calendar" size={24} color="#0a7ea4" />
                <ThemedText style={styles.datePickerTitle}>Chọn ngày nhận phòng</ThemedText>
              </View>
              
              {/* Calendar */}
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => changeCalendarMonth('prev')}
                  >
                    <Ionicons name="chevron-back" size={20} color="#0a7ea4" />
                  </TouchableOpacity>
                  <ThemedText style={styles.calendarMonthText}>
                    {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => changeCalendarMonth('next')}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarWeekDays}>
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
                    <View key={index} style={styles.calendarWeekDay}>
                      <ThemedText style={styles.calendarWeekDayText}>{day}</ThemedText>
                    </View>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {getCalendarDays(calendarMonth).map((day, index) => {
                    if (day === null) {
                      return <View key={index} style={styles.calendarDay} />;
                    }

                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === today.getTime();
                    const isPast = date < today;
                    const isSelected = tempCheckIn && 
                      date.getDate() === tempCheckIn.getDate() &&
                      date.getMonth() === tempCheckIn.getMonth() &&
                      date.getFullYear() === tempCheckIn.getFullYear();

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                          isPast && styles.calendarDayPast,
                        ]}
                        onPress={() => {
                          if (!isPast) {
                            handleCalendarDateSelect(day, 'checkIn');
                          }
                        }}
                        disabled={isPast}
                      >
                        <ThemedText
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isPast && styles.calendarDayTextPast,
                          ]}
                        >
                          {day}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => {
                  setShowCheckInPicker(false);
                  setTempCheckIn(null);
                }}
              >
                <ThemedText style={styles.datePickerCancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showCheckOutPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCheckOutPicker(false)}
        >
          <View style={styles.datePickerModal}>
            <TouchableOpacity
              style={styles.datePickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowCheckOutPicker(false)}
            />
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Ionicons name="calendar" size={24} color="#0a7ea4" />
                <ThemedText style={styles.datePickerTitle}>Chọn ngày trả phòng</ThemedText>
              </View>
              
              {checkIn && (
                <View style={styles.datePickerInfo}>
                  <Ionicons name="information-circle-outline" size={16} color="#0a7ea4" />
                  <ThemedText style={styles.datePickerInfoText}>
                    Ngày nhận phòng: {formatDateFull(checkIn)}
                  </ThemedText>
                </View>
              )}

              {/* Calendar */}
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => changeCalendarMonth('prev')}
                  >
                    <Ionicons name="chevron-back" size={20} color="#0a7ea4" />
                  </TouchableOpacity>
                  <ThemedText style={styles.calendarMonthText}>
                    {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => changeCalendarMonth('next')}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarWeekDays}>
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
                    <View key={index} style={styles.calendarWeekDay}>
                      <ThemedText style={styles.calendarWeekDayText}>{day}</ThemedText>
                    </View>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {getCalendarDays(calendarMonth).map((day, index) => {
                    if (day === null) {
                      return <View key={index} style={styles.calendarDay} />;
                    }

                    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                    const checkInDate = checkIn ? new Date(checkIn) : null;
                    const minDate = checkInDate ? new Date(checkInDate) : new Date();
                    minDate.setDate(minDate.getDate() + 1);
                    minDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === today.getTime();
                    const isPast = checkInDate 
                      ? date <= checkInDate 
                      : date < today;
                    const isSelected = tempCheckOut && 
                      date.getDate() === tempCheckOut.getDate() &&
                      date.getMonth() === tempCheckOut.getMonth() &&
                      date.getFullYear() === tempCheckOut.getFullYear();

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                          isPast && styles.calendarDayPast,
                        ]}
                        onPress={() => {
                          if (!isPast) {
                            handleCalendarDateSelect(day, 'checkOut');
                          }
                        }}
                        disabled={isPast}
                      >
                        <ThemedText
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isPast && styles.calendarDayTextPast,
                          ]}
                        >
                          {day}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => {
                  setShowCheckOutPicker(false);
                  setTempCheckOut(null);
                }}
              >
                <ThemedText style={styles.datePickerCancelButtonText}>Hủy</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Number of Guests */}
        {selectedRoom && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={24} color="#0a7ea4" />
              <ThemedText style={styles.sectionTitle}>Số Lượng Khách</ThemedText>
            </View>
            <View style={styles.guestsInfoContainer}>
              <Ionicons name="people" size={20} color="#0a7ea4" />
              <ThemedText style={styles.guestsInfoText}>
                {numberOfGuests} khách (theo loại phòng {getRoomTypeLabel(selectedRoom.type)})
              </ThemedText>
            </View>
          </View>
        )}

        {/* Guest Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={24} color="#0a7ea4" />
            <ThemedText style={styles.sectionTitle}>Thông Tin Khách Hàng</ThemedText>
            {!isEditingGuestInfo && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditingGuestInfo(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={18} color="#0a7ea4" />
                <ThemedText style={styles.editButtonText}>Chỉnh sửa</ThemedText>
              </TouchableOpacity>
            )}
            {isEditingGuestInfo && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => {
                    setGuestInfo(originalGuestInfo);
                    setIsEditingGuestInfo(false);
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.cancelEditButtonText}>Hủy</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveEditButton}
                  onPress={() => {
                    setOriginalGuestInfo(guestInfo);
                    setIsEditingGuestInfo(false);
                  }}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.saveEditButtonText}>Lưu</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isEditingGuestInfo ? (
            // Chế độ xem (read-only)
            <View style={styles.guestInfoView}>
              <View style={styles.guestInfoRow}>
                <View style={styles.guestInfoIconContainer}>
                  <Ionicons name="person" size={20} color="#0a7ea4" />
                </View>
                <View style={styles.guestInfoContent}>
                  <ThemedText style={styles.guestInfoLabel}>Họ và tên</ThemedText>
                  <ThemedText style={styles.guestInfoValue}>{guestInfo.fullName || 'Chưa có'}</ThemedText>
                </View>
              </View>
              <View style={styles.guestInfoRow}>
                <View style={styles.guestInfoIconContainer}>
                  <Ionicons name="call" size={20} color="#0a7ea4" />
                </View>
                <View style={styles.guestInfoContent}>
                  <ThemedText style={styles.guestInfoLabel}>Số điện thoại</ThemedText>
                  <ThemedText style={styles.guestInfoValue}>{guestInfo.phone || 'Chưa có'}</ThemedText>
                </View>
              </View>
              <View style={styles.guestInfoRow}>
                <View style={styles.guestInfoIconContainer}>
                  <Ionicons name="mail" size={20} color="#0a7ea4" />
                </View>
                <View style={styles.guestInfoContent}>
                  <ThemedText style={styles.guestInfoLabel}>Email</ThemedText>
                  <ThemedText style={styles.guestInfoValue}>{guestInfo.email || 'Chưa có'}</ThemedText>
                </View>
              </View>
              {guestInfo.specialRequests && (
                <View style={styles.guestInfoRow}>
                  <View style={styles.guestInfoIconContainer}>
                    <Ionicons name="document-text" size={20} color="#0a7ea4" />
                  </View>
                  <View style={styles.guestInfoContent}>
                    <ThemedText style={styles.guestInfoLabel}>Yêu cầu đặc biệt</ThemedText>
                    <ThemedText style={styles.guestInfoValue}>{guestInfo.specialRequests}</ThemedText>
                  </View>
                </View>
              )}
            </View>
          ) : (
            // Chế độ chỉnh sửa
            <>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Họ và tên *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#94a3b8"
                  value={guestInfo.fullName}
                  onChangeText={(text) => setGuestInfo({ ...guestInfo, fullName: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Số điện thoại *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#94a3b8"
                  value={guestInfo.phone}
                  onChangeText={(text) => setGuestInfo({ ...guestInfo, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Email *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email"
                  placeholderTextColor="#94a3b8"
                  value={guestInfo.email}
                  onChangeText={(text) => setGuestInfo({ ...guestInfo, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Yêu cầu đặc biệt</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Nhập yêu cầu đặc biệt (nếu có)"
                  placeholderTextColor="#94a3b8"
                  value={guestInfo.specialRequests}
                  onChangeText={(text) => setGuestInfo({ ...guestInfo, specialRequests: text })}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          )}
        </View>

        {/* Coupon Section */}
        {selectedRoom && checkIn && checkOut && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ticket-outline" size={24} color="#0a7ea4" />
              <ThemedText style={styles.sectionTitle}>Mã Giảm Giá</ThemedText>
            </View>
            
            {!appliedCoupon ? (
              <View style={styles.couponInputContainer}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Nhập mã giảm giá"
                  placeholderTextColor="#94a3b8"
                  value={couponCode}
                  onChangeText={(text) => {
                    setCouponCode(text.toUpperCase());
                    setCouponError(null);
                  }}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={styles.viewCouponsButton}
                  onPress={handleOpenCouponList}
                  activeOpacity={0.8}
                >
                  <Ionicons name="ticket-outline" size={18} color="#0a7ea4" />
                  <ThemedText style={styles.viewCouponsButtonText}>Xem</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyCouponButton, isApplyingCoupon && styles.applyCouponButtonDisabled]}
                  onPress={handleApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  activeOpacity={0.8}
                >
                  {isApplyingCoupon ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={styles.applyCouponButtonText}>Áp dụng</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <LinearGradient
                colors={['#f0fdf4', '#dcfce7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.appliedCouponContainer}
              >
                <View style={styles.appliedCouponContent}>
                  <View style={styles.appliedCouponLeft}>
                    <View style={styles.appliedCouponIconWrapper}>
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    </View>
                    <View style={styles.appliedCouponTextContainer}>
                      <ThemedText style={styles.appliedCouponName}>{appliedCoupon.name}</ThemedText>
                      <View style={styles.appliedCouponCodeContainer}>
                        <Ionicons name="ticket" size={14} color="#0a7ea4" />
                        <ThemedText style={styles.appliedCouponCode}>{appliedCoupon.code}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.appliedCouponRight}>
                    <ThemedText style={styles.appliedCouponDiscount}>
                      -{formatPrice(appliedCoupon.discountAmount)} VNĐ
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.removeCouponButton}
                      onPress={handleRemoveCoupon}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            )}
            
            {couponError && (
              <View style={styles.couponErrorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <ThemedText style={styles.couponErrorText}>{couponError}</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Coupon List Modal */}
        <Modal
          visible={showCouponList}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCouponList(false)}
        >
          <View style={styles.couponListModal}>
            <TouchableOpacity
              style={styles.couponListBackdrop}
              activeOpacity={1}
              onPress={() => setShowCouponList(false)}
            />
            <View style={styles.couponListContainer}>
              <View style={styles.couponListHeader}>
                <Ionicons name="ticket" size={24} color="#0a7ea4" />
                <ThemedText style={styles.couponListTitle}>Danh Sách Mã Giảm Giá</ThemedText>
                <TouchableOpacity
                  style={styles.couponListCloseButton}
                  onPress={() => setShowCouponList(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {isLoadingCoupons ? (
                <View style={styles.couponListLoading}>
                  <ActivityIndicator size="large" color="#0a7ea4" />
                  <ThemedText style={styles.couponListLoadingText}>Đang tải...</ThemedText>
                </View>
              ) : availableCoupons.length === 0 ? (
                <View style={styles.couponListEmpty}>
                  <Ionicons name="ticket-outline" size={48} color="#cbd5e1" />
                  <ThemedText style={styles.couponListEmptyText}>Không có mã giảm giá nào</ThemedText>
                </View>
              ) : (
                <ScrollView 
                  style={styles.couponListScroll}
                  contentContainerStyle={styles.couponListScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {availableCoupons.map((coupon) => {
                    const discountText = coupon.discountType === 'percent'
                      ? `${coupon.discountValue}%`
                      : `${formatPrice(coupon.discountValue)} VNĐ`;
                    
                    return (
                      <TouchableOpacity
                        key={coupon._id}
                        style={[
                          styles.couponListItem,
                          !coupon.isValid && styles.couponListItemDisabled
                        ]}
                        onPress={() => handleSelectCoupon(coupon)}
                        disabled={!coupon.isValid}
                        activeOpacity={coupon.isValid ? 0.7 : 1}
                      >
                        <View style={styles.couponListItemContent}>
                          <View style={styles.couponListItemHeader}>
                            <View style={styles.couponListItemInfo}>
                              <ThemedText style={[
                                styles.couponListItemName,
                                !coupon.isValid && styles.couponListItemNameDisabled
                              ]}>
                                {coupon.name}
                              </ThemedText>
                              <ThemedText style={[
                                styles.couponListItemCode,
                                !coupon.isValid && styles.couponListItemCodeDisabled
                              ]}>
                                {coupon.code}
                              </ThemedText>
                            </View>
                            <View style={[
                              styles.couponListItemBadge,
                              !coupon.isValid && styles.couponListItemBadgeDisabled
                            ]}>
                              <ThemedText style={[
                                styles.couponListItemDiscount,
                                !coupon.isValid && styles.couponListItemDiscountDisabled
                              ]}>
                                -{discountText}
                              </ThemedText>
                            </View>
                          </View>
                          
                          {coupon.minOrder && (
                            <View style={styles.couponListItemDetail}>
                              <Ionicons name="cash-outline" size={14} color={coupon.isValid ? "#64748b" : "#94a3b8"} />
                              <ThemedText style={[
                                styles.couponListItemDetailText,
                                !coupon.isValid && styles.couponListItemDetailTextDisabled
                              ]}>
                                Đơn hàng tối thiểu: {formatPrice(coupon.minOrder)} VNĐ
                              </ThemedText>
                            </View>
                          )}
                          
                          {!coupon.isValid && coupon.reason && (
                            <View style={styles.couponListItemError}>
                              <Ionicons name="alert-circle" size={14} color="#ef4444" />
                              <ThemedText style={styles.couponListItemErrorText}>
                                {coupon.reason}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        
                        {coupon.isValid && (
                          <View style={styles.couponListItemArrow}>
                            <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Price Summary */}
        {selectedRoom && checkIn && checkOut && (
          <View style={styles.priceSummary}>
            <ThemedText style={styles.priceSummaryTitle}>Tóm Tắt Giá</ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>
                {formatPrice(selectedRoom.pricePerNight)} VNĐ × {numberOfNights} đêm
              </ThemedText>
              <ThemedText style={styles.priceValue}>
                {formatPrice(calculateOriginalPrice())} VNĐ
              </ThemedText>
            </View>
            {appliedCoupon && (
              <View style={styles.priceRow}>
                <ThemedText style={styles.priceLabel}>
                  Giảm giá ({appliedCoupon.code})
                </ThemedText>
                <ThemedText style={styles.discountValue}>
                  -{formatPrice(appliedCoupon.discountAmount)} VNĐ
                </ThemedText>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Tổng cộng</ThemedText>
              <ThemedText style={styles.totalValue}>
                {formatPrice(totalPrice)} VNĐ
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceInfo}>
          {totalPrice > 0 && (
            <>
              <ThemedText style={styles.bottomPriceLabel}>Tổng giá</ThemedText>
              <ThemedText style={styles.bottomPriceAmount}>
                {formatPrice(totalPrice)} VNĐ
              </ThemedText>
            </>
          )}
        </View>
        <TouchableOpacity
          style={[styles.submitButton, (!selectedRoom || !checkIn || !checkOut || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedRoom || !checkIn || !checkOut || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Xác Nhận Đặt Phòng</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  homestayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  homestayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  homestayAddress: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.3,
    flex: 1,
  },
  roomsList: {
    gap: 12,
  },
  roomCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  roomCardSelected: {
    borderColor: '#0a7ea4',
    backgroundColor: '#f0f9ff',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    flex: 1,
  },
  roomTypeBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roomTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  roomPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  dateSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 16,
  },
  dateCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 115,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  dateCardSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0a7ea4',
    borderWidth: 2,
  },
  dateCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  dateCardLocked: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  dateCardLabelSelected: {
    color: '#0a7ea4',
  },
  dateCardContent: {
    flex: 1,
    marginTop: 8,
  },
  dateCardDay: {
    fontSize: 32,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 8,
    lineHeight: 36,
  },
  dateCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dateCardMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  dateCardDayName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateCardPlaceholder: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
  },
  dateArrow: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 40,
    paddingTop: 24,
  },
  dateNights: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a7ea4',
    marginTop: 4,
    textAlign: 'center',
  },
  dateSummary: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    gap: 8,
  },
  dateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateSummaryText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  noRoomsMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  noRoomsText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '500',
    lineHeight: 18,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  datePickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    zIndex: 1000,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    textAlign: 'center',
  },
  datePickerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  datePickerInfoText: {
    fontSize: 13,
    color: '#0a7ea4',
    fontWeight: '500',
    flex: 1,
  },
  datePickerPreview: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    alignItems: 'center',
  },
  datePickerPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a7ea4',
    marginBottom: 4,
  },
  datePickerPreviewNights: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  datePickerQuickButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  datePickerQuickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
  },
  datePickerQuickButtonText: {
    color: '#0a7ea4',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 12,
    marginBottom: 16,
  },
  datePickerConfirmButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  datePickerConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  datePickerCancelButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  datePickerCancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    textTransform: 'capitalize',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#0a7ea4',
    borderRadius: 20,
  },
  calendarDayToday: {
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextPast: {
    color: '#94a3b8',
  },
  mobileDateInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  guestsInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#dbeafe',
    gap: 12,
  },
  guestsInfoText: {
    flex: 1,
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
  },
  roomTypesList: {
    gap: 12,
  },
  roomTypeCard: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  roomTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomTypeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  roomTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomTypeGuests: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  roomTypeDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  roomTypeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  roomTypeCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  roomTypePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  selectedRoomTypeHeader: {
    marginBottom: 16,
  },
  backToTypesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  backToTypesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  roomGuestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  roomGuests: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#11181C',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priceSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  priceSummaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f97316',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
    alignItems: 'center',
  },
  bottomPriceInfo: {
    flex: 1,
    gap: 4,
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomPriceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f97316',
    letterSpacing: 0.5,
  },
  submitButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stepContainer: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepCircleActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  stepCircleInactive: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  stepNumberInactive: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 60,
  },
  stepLabelActive: {
    color: '#0a7ea4',
  },
  stepLabelInactive: {
    color: '#94a3b8',
  },
  stepLine: {
    height: 2,
    width: 24,
    marginHorizontal: 8,
    marginTop: -20,
  },
  stepLineInactive: {
    backgroundColor: '#e2e8f0',
  },
  preSelectedRoomCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#0a7ea4',
    marginBottom: 16,
  },
  preSelectedRoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  preSelectedRoomIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  preSelectedRoomInfo: {
    flex: 1,
    gap: 4,
  },
  preSelectedRoomName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.3,
  },
  preSelectedRoomType: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  preSelectedRoomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    flexShrink: 0,
  },
  preSelectedRoomBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.2,
  },
  preSelectedRoomDetails: {
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  preSelectedRoomDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preSelectedRoomDetailText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
  lockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  couponInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#11181C',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  viewCouponsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0a7ea4',
    justifyContent: 'center',
  },
  viewCouponsButtonText: {
    color: '#0a7ea4',
    fontSize: 14,
    fontWeight: '700',
  },
  applyCouponButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  applyCouponButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  applyCouponButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  appliedCouponContainer: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  appliedCouponContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appliedCouponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appliedCouponIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedCouponTextContainer: {
    flex: 1,
    gap: 6,
  },
  appliedCouponName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.3,
  },
  appliedCouponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedCouponCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a7ea4',
    letterSpacing: 1.2,
  },
  appliedCouponRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  appliedCouponDiscount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  removeCouponButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  couponErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  couponErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  couponListModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  couponListBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  couponListContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '100%',
    minHeight: '65%',
  },
  couponListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    position: 'relative',
  },
  couponListTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#11181C',
    textAlign: 'center',
  },
  couponListCloseButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  couponListLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  couponListLoadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  couponListEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  couponListEmptyText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  couponListScroll: {
    flex: 1,
  },
  couponListScrollContent: {
    gap: 12,
    paddingBottom: 20,
  },
  couponListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  couponListItemDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
  couponListItemContent: {
    flex: 1,
    gap: 8,
  },
  couponListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  couponListItemInfo: {
    flex: 1,
    gap: 4,
  },
  couponListItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  couponListItemNameDisabled: {
    color: '#94a3b8',
  },
  couponListItemCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a7ea4',
    letterSpacing: 1,
  },
  couponListItemCodeDisabled: {
    color: '#94a3b8',
  },
  couponListItemBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  couponListItemBadgeDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  couponListItemDiscount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  couponListItemDiscountDisabled: {
    color: '#94a3b8',
  },
  couponListItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  couponListItemDetailText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  couponListItemDetailTextDisabled: {
    color: '#94a3b8',
  },
  couponListItemError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  couponListItemErrorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    flex: 1,
  },
  couponListItemArrow: {
    marginLeft: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelEditButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelEditButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  saveEditButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveEditButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  guestInfoView: {
    gap: 16,
  },
  guestInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  guestInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  guestInfoContent: {
    flex: 1,
    gap: 4,
  },
  guestInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  guestInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
});

