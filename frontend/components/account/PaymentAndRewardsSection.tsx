import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';

export function PaymentAndRewardsSection() {
  return (
    <View style={styles.container}>
      {/* Lựa chọn thanh toán */}
      <ThemedText style={styles.sectionTitle}>Lựa chọn thanh toán của tôi</ThemedText>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="card-outline" size={24} color="#666" />
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color="#666" />
          </View>
        </View>
        <ThemedText style={styles.cardText}>Thanh toán</ThemedText>
        <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
      </TouchableOpacity>

      {/* Phần thưởng */}
      <ThemedText style={styles.sectionTitle}>Phần thưởng của tôi</ThemedText>
      <TouchableOpacity style={styles.card}>
        <View style={styles.cardIconContainer}>
          <Ionicons name="pricetag-outline" size={24} color="#666" />
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color="#666" />
          </View>
        </View>
        <ThemedText style={styles.cardText}>Phần thưởng của tôi</ThemedText>
        <Ionicons name="chevron-forward" size={20} color="#0a7ea4" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    color: '#11181C',
    fontWeight: '500',
  },
});





