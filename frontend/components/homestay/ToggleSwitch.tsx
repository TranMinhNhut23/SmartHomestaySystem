import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface ToggleSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  trueLabel: string;
  falseLabel: string;
  disabled?: boolean;
}

export default function ToggleSwitch({
  label,
  value,
  onValueChange,
  trueLabel,
  falseLabel,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleOption, value && styles.toggleOptionActive]}
          onPress={() => !disabled && onValueChange(true)}
          disabled={disabled}
        >
          <ThemedText
            style={[styles.toggleOptionText, value && styles.toggleOptionTextActive]}
          >
            {trueLabel}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleOption, !value && styles.toggleOptionActive]}
          onPress={() => !disabled && onValueChange(false)}
          disabled={disabled}
        >
          <ThemedText
            style={[styles.toggleOptionText, !value && styles.toggleOptionTextActive]}
          >
            {falseLabel}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#11181C',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  toggleOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});











