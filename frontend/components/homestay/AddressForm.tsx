import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import Dropdown from '@/components/ui/dropdown';
import { Province, District, Ward, Address } from '@/types/homestay';
import { apiService } from '@/services/api';

interface AddressFormProps {
  address: Address;
  onAddressChange: (address: Address) => void;
  disabled?: boolean;
}

export default function AddressForm({
  address,
  onAddressChange,
  disabled = false,
}: AddressFormProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [hasLoadedDistricts, setHasLoadedDistricts] = useState(false);
  const [hasLoadedWards, setHasLoadedWards] = useState(false);

  useEffect(() => {
    loadProvinces();
  }, []);

  // Load districts khi có address sẵn (khi edit) - chỉ chạy một lần khi provinces đã load xong
  useEffect(() => {
    if (address.province.code && provinces.length > 0 && !hasLoadedDistricts) {
      loadDistrictsForProvince(address.province.code);
      setHasLoadedDistricts(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.province.code, provinces.length]);

  // Load wards khi có address sẵn (khi edit) - chỉ chạy một lần khi districts đã load xong
  useEffect(() => {
    if (address.district.code && districts.length > 0 && !hasLoadedWards) {
      loadWardsForDistrict(address.district.code);
      setHasLoadedWards(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.district.code, districts.length]);

  const loadProvinces = async () => {
    try {
      setIsLoadingProvinces(true);
      const response = await apiService.getProvinces();
      if (response.success && response.data) {
        setProvinces(response.data);
      }
    } catch (error: any) {
      console.error('Error loading provinces:', error);
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const loadDistrictsForProvince = async (provinceCode: string) => {
    try {
      const selectedProvince = provinces.find((p) => p.code === provinceCode);
      if (selectedProvince && selectedProvince.districts && selectedProvince.districts.length > 0) {
        // Nếu province đã có districts, dùng luôn
        setDistricts(selectedProvince.districts);
      } else {
        // Nếu không có, gọi API
        const response = await apiService.getDistricts(provinceCode);
        if (response.success && response.data) {
          setDistricts(response.data);
        }
      }
    } catch (error: any) {
      console.error('Error loading districts:', error);
    }
  };

  const loadWardsForDistrict = async (districtCode: string) => {
    try {
      const selectedDistrict = districts.find((d) => d.code === districtCode);
      if (selectedDistrict && selectedDistrict.wards && selectedDistrict.wards.length > 0) {
        // Nếu district đã có wards, dùng luôn
        setWards(selectedDistrict.wards);
        setIsLoadingWards(false);
      } else {
        // Nếu không có, gọi API
        setIsLoadingWards(true);
        const response = await apiService.getWards(districtCode);
        if (response.success && response.data) {
          setWards(response.data);
        } else {
          setWards([]);
        }
        setIsLoadingWards(false);
      }
    } catch (error: any) {
      console.error('Error loading wards:', error);
      setIsLoadingWards(false);
    }
  };

  const handleProvinceChange = (provinceCode: string) => {
    const selectedProvince = provinces.find((p) => p.code === provinceCode);
    if (selectedProvince) {
      const newAddress: Address = {
        province: { code: selectedProvince.code, name: selectedProvince.name },
        district: { code: '', name: '' },
        ward: { code: '', name: '' },
        street: address.street,
      };
      onAddressChange(newAddress);
      setDistricts(selectedProvince.districts || []);
      setWards([]);
      setIsLoadingWards(false);
      // Reset flags khi user thay đổi province
      setHasLoadedDistricts(false);
      setHasLoadedWards(false);
    }
  };

  const handleDistrictChange = async (districtCode: string) => {
    const selectedDistrict = districts.find((d) => d.code === districtCode);
    if (selectedDistrict) {
      const newAddress: Address = {
        ...address,
        district: { code: selectedDistrict.code, name: selectedDistrict.name },
        ward: { code: '', name: '' },
      };
      onAddressChange(newAddress);
      
      // Reset wards
      setWards([]);
      // Reset flag khi user thay đổi district
      setHasLoadedWards(false);
      
      // Nếu district đã có wards trong dữ liệu, sử dụng luôn
      if (selectedDistrict.wards && selectedDistrict.wards.length > 0) {
        setWards(selectedDistrict.wards);
        setIsLoadingWards(false);
      } else {
        // Nếu không có, gọi API riêng để lấy wards
        setIsLoadingWards(true);
        try {
          const response = await apiService.getWards(districtCode);
          if (response.success && response.data) {
            setWards(response.data);
          } else {
            setWards([]);
          }
        } catch (error: any) {
          console.error('Error loading wards:', error);
          // Nếu API lỗi, thử dùng wards từ district (nếu có)
          setWards(selectedDistrict.wards || []);
        } finally {
          setIsLoadingWards(false);
        }
      }
    }
  };

  const handleWardChange = (wardCode: string) => {
    const selectedWard = wards.find((w) => w.code === wardCode);
    if (selectedWard) {
      const newAddress: Address = {
        ...address,
        ward: { code: selectedWard.code, name: selectedWard.name },
      };
      onAddressChange(newAddress);
    }
  };

  const handleStreetChange = (street: string) => {
    onAddressChange({ ...address, street });
  };

  return (
    <View style={[styles.container, styles.card]}>
      <View style={styles.labelContainer}>
        <Ionicons name="location" size={20} color="#0a7ea4" />
        <ThemedText style={styles.label}>Địa chỉ chi tiết *</ThemedText>
      </View>

      {isLoadingProvinces ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0a7ea4" />
          <ThemedText style={styles.loadingText}>Đang tải danh sách tỉnh thành...</ThemedText>
        </View>
      ) : (
        <>
          <Dropdown
            label="Tỉnh/Thành"
            value={address.province.code}
            options={provinces.map((p) => ({ code: p.code, name: p.name }))}
            onSelect={handleProvinceChange}
            placeholder="Chọn tỉnh/thành"
            disabled={disabled}
          />

          {districts.length > 0 && (
            <>
              <Dropdown
                label="Quận/Huyện"
                value={address.district.code}
                options={districts.map((d) => ({ code: d.code, name: d.name }))}
                onSelect={handleDistrictChange}
                placeholder="Chọn quận/huyện"
                disabled={disabled}
              />
              
              {/* Hiển thị dropdown phường/xã khi đã chọn quận/huyện */}
              {address.district.code && (
                <>
                  {isLoadingWards ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#0a7ea4" />
                      <ThemedText style={styles.loadingText}>
                        Đang tải danh sách phường/xã...
                      </ThemedText>
                    </View>
                  ) : wards.length > 0 ? (
                    <Dropdown
                      label="Phường/Xã"
                      value={address.ward.code}
                      options={wards.map((w) => ({ code: w.code, name: w.name }))}
                      onSelect={handleWardChange}
                      placeholder="Chọn phường/xã"
                      disabled={disabled}
                    />
                  ) : (
                    <View style={styles.loadingContainer}>
                      <ThemedText style={styles.loadingText}>
                        Không tìm thấy phường/xã cho quận/huyện này
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      <TextInput
        style={[styles.input, { backgroundColor: '#fff', color: '#000', marginTop: 12 }]}
        placeholder="Số nhà, tên đường..."
        placeholderTextColor="#666"
        value={address.street}
        onChangeText={handleStreetChange}
        editable={!disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 44,
  },
});

