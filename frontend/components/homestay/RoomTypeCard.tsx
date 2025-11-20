import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { RoomTypeInfo, RoomGroup } from '@/types/homestay';

interface RoomTypeCardProps {
  roomType: RoomTypeInfo;
  isSelected: boolean;
  roomGroup?: RoomGroup;
  onToggle: () => void;
  onQuantityChange: (quantity: number) => void;
  onPriceChange: (price: number) => void;
  disabled?: boolean;
}

export default function RoomTypeCard({
  roomType,
  isSelected,
  roomGroup,
  onToggle,
  onQuantityChange,
  onPriceChange,
  disabled = false,
}: RoomTypeCardProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, isSelected && styles.headerSelected]}
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.checkboxContainer}>
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </View>
        </View>
        <View style={styles.infoContainer}>
          <ThemedText style={styles.label}>
            {roomType.label} - {roomType.description}
          </ThemedText>
        </View>
      </TouchableOpacity>

      {isSelected && roomGroup && (
        <View style={styles.inputsContainer}>
          <View style={styles.inputRow}>
            <ThemedText style={styles.inputLabel}>Số lượng phòng</ThemedText>
            <View style={styles.numberInputContainer}>
              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => {
                  if (roomGroup.quantity > 1) {
                    onQuantityChange(roomGroup.quantity - 1);
                  }
                }}
                disabled={disabled || roomGroup.quantity <= 1}
              >
                <Ionicons name="remove" size={20} color="#0a7ea4" />
              </TouchableOpacity>
              <TextInput
                style={styles.numberInput}
                value={roomGroup.quantity.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  if (num >= 1) {
                    onQuantityChange(num);
                  }
                }}
                keyboardType="numeric"
                editable={!disabled}
              />
              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => onQuantityChange(roomGroup.quantity + 1)}
                disabled={disabled}
              >
                <Ionicons name="add" size={20} color="#0a7ea4" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputRow}>
            <ThemedText style={styles.inputLabel}>Giá mỗi đêm (VNĐ)</ThemedText>
            <TextInput
              style={[styles.priceInput, { backgroundColor: '#fff', color: '#000' }]}
              value={roomGroup.pricePerNight.toString()}
              onChangeText={(text) => {
                const num = parseFloat(text.replace(/[^0-9]/g, '')) || 0;
                onPriceChange(num);
              }}
              keyboardType="numeric"
              placeholder="Nhập giá..."
              placeholderTextColor="#666"
              editable={!disabled}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0a7ea4',
    borderBottomColor: '#0a7ea4',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  infoContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    color: '#11181C',
    lineHeight: 22,
  },
  inputsContainer: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#fafbfc',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputRow: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#11181C',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  numberInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#fff',
    color: '#11181C',
    minHeight: 40,
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    minHeight: 40,
  },
});

