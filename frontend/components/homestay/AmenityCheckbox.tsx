import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';

interface AmenityCheckboxProps {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function AmenityCheckbox({
  label,
  isChecked,
  onToggle,
  disabled = false,
}: AmenityCheckboxProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isChecked && styles.containerChecked]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.checkboxContainer}>
        <View
          style={[
            styles.checkbox,
            isChecked && styles.checkboxChecked,
          ]}
        >
          {isChecked && (
            <Ionicons name="checkmark" size={16} color="#fff" />
          )}
        </View>
      </View>
      <ThemedText style={[styles.label, isChecked && styles.labelChecked]}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  containerChecked: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0a7ea4',
    borderWidth: 2,
    shadowColor: '#0a7ea4',
    shadowOpacity: 0.1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  label: {
    fontSize: 15,
    color: '#11181C',
    flex: 1,
  },
  labelChecked: {
    fontWeight: '600',
    color: '#0a7ea4',
  },
});

