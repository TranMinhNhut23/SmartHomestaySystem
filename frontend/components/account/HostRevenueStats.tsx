import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart } from 'react-native-chart-kit';

interface Booking {
  _id: string;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  createdAt: string;
  homestay?: {
    _id: string;
    name: string;
  };
  room?: {
    _id: string;
    name: string;
  };
}

interface HostRevenueStatsProps {
  bookings: Booking[];
  homestays: any[];
}

type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

const screenWidth = Dimensions.get('window').width;

export function HostRevenueStats({ bookings, homestays }: HostRevenueStatsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  
  // Đảm bảo bookings là mảng
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const formatRevenue = (price: number) => {
    if (price >= 1000000000) {
      return `${(price / 1000000000).toFixed(1)}T`;
    } else if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `${(price / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Tính toán doanh thu theo khoảng thời gian
  const getRevenueByPeriod = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (selectedPeriod) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

      const filteredBookings = safeBookings.filter((b: Booking) => {
      if (b.paymentStatus !== 'paid') return false;
      const bookingDate = b.createdAt ? new Date(b.createdAt) : null;
      if (!bookingDate) return false;
      return bookingDate >= startDate && bookingDate <= endDate;
    });

    return filteredBookings.reduce((sum: number, b: Booking) => sum + (b.totalPrice || 0), 0);
  }, [safeBookings, selectedPeriod]);

  // Doanh thu theo trạng thái đặt phòng
  const revenueByStatus = useMemo(() => {
    const now = new Date();
    const statusRevenue: Record<string, number> = {
      completed: 0,
      checkedIn: 0,
      checkedOut: 0,
      cancelledNoRefund: 0,
    };

    safeBookings.forEach((b: Booking) => {
      const totalPrice = b.totalPrice || 0;
      const checkIn = b.checkIn ? new Date(b.checkIn) : null;
      const checkOut = b.checkOut ? new Date(b.checkOut) : null;

      // Xử lý trường hợp cancelled - có thể có paymentStatus là 'paid', 'refunded', hoặc 'partial_refunded'
      if (b.status === 'cancelled') {
        // Chỉ tính các booking bị hủy nhưng không hoàn tiền (paymentStatus vẫn là 'paid')
        if (b.paymentStatus === 'paid') {
          statusRevenue.cancelledNoRefund += totalPrice;
        }
        return; // Không xử lý các trường hợp khác cho cancelled bookings
      }

      // Chỉ tính các booking đã thanh toán cho các trạng thái khác
      if (b.paymentStatus !== 'paid') return;

      if (b.status === 'completed') {
        // Hoàn tất
        statusRevenue.completed += totalPrice;
      } else if (b.status === 'confirmed') {
        // Đã xác nhận - kiểm tra check-in/check-out
        if (checkIn && checkOut) {
          if (checkIn <= now && checkOut > now) {
            // Đã check-in nhưng chưa check-out
            statusRevenue.checkedIn += totalPrice;
          } else if (checkOut < now) {
            // Đã check-out (nhưng chưa completed)
            statusRevenue.checkedOut += totalPrice;
          } else if (checkIn > now) {
            // Đã xác nhận nhưng chưa đến ngày check-in - không tính vào bất kỳ trạng thái nào
            // Có thể tính vào "Đã check-in" vì đã thanh toán và xác nhận
            statusRevenue.checkedIn += totalPrice;
          }
        } else {
          // Không có thông tin check-in/check-out, coi như đã check-in
          statusRevenue.checkedIn += totalPrice;
        }
      }
    });

    return statusRevenue;
  }, [safeBookings]);

  // Doanh thu theo phương thức thanh toán
  const revenueByPaymentMethod = useMemo(() => {
    const methodRevenue: Record<string, number> = {
      momo: 0,
      vnpay: 0,
      cash: 0,
      wallet: 0,
    };

    safeBookings.forEach((b: Booking) => {
      if (b.paymentStatus !== 'paid') return;
      const method = b.paymentMethod || 'cash';
      const totalPrice = b.totalPrice || 0;
      
      if (method in methodRevenue) {
        methodRevenue[method] += totalPrice;
      } else {
        methodRevenue.cash += totalPrice; // Default to cash
      }
    });

    return methodRevenue;
  }, [safeBookings]);

  // Doanh thu theo homestay
  const revenueByHomestay = useMemo(() => {
    const homestayRevenue: Record<string, { name: string; revenue: number }> = {};

    safeBookings.forEach((b: Booking) => {
      if (b.paymentStatus !== 'paid') return;
      const homestayId = b.homestay?._id || 'unknown';
      const homestayName = b.homestay?.name || 'Không xác định';
      const totalPrice = b.totalPrice || 0;

      if (!homestayRevenue[homestayId]) {
        homestayRevenue[homestayId] = { name: homestayName, revenue: 0 };
      }
      homestayRevenue[homestayId].revenue += totalPrice;
    });

    return Object.entries(homestayRevenue)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10
  }, [safeBookings]);

  // Doanh thu theo phòng
  const revenueByRoom = useMemo(() => {
    const roomRevenue: Record<string, { name: string; homestayName: string; revenue: number }> = {};

    safeBookings.forEach((b: Booking) => {
      if (b.paymentStatus !== 'paid') return;
      const roomId = b.room?._id || 'unknown';
      const roomName = b.room?.name || 'Không xác định';
      const homestayName = b.homestay?.name || 'Không xác định';
      const totalPrice = b.totalPrice || 0;

      if (!roomRevenue[roomId]) {
        roomRevenue[roomId] = { name: roomName, homestayName, revenue: 0 };
      }
      roomRevenue[roomId].revenue += totalPrice;
    });

    return Object.entries(roomRevenue)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10
  }, [safeBookings]);

  // Chuẩn bị dữ liệu cho biểu đồ trạng thái
  const statusChartData = [
    {
      name: 'Hoàn tất',
      revenue: revenueByStatus.completed,
      color: '#22c55e',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Đã check-in',
      revenue: revenueByStatus.checkedIn,
      color: '#3b82f6',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Đã check-out',
      revenue: revenueByStatus.checkedOut,
      color: '#8b5cf6',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Hủy không hoàn',
      revenue: revenueByStatus.cancelledNoRefund,
      color: '#ef4444',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
  ].filter(item => item.revenue > 0);

  // Chuẩn bị dữ liệu cho biểu đồ phương thức thanh toán
  const paymentMethodChartData = [
    {
      name: 'Ví MoMo',
      revenue: revenueByPaymentMethod.momo,
      color: '#d946ef',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'VNPAY',
      revenue: revenueByPaymentMethod.vnpay,
      color: '#0ea5e9',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Tiền mặt',
      revenue: revenueByPaymentMethod.cash,
      color: '#10b981',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Ví khách',
      revenue: revenueByPaymentMethod.wallet,
      color: '#f59e0b',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
  ].filter(item => item.revenue > 0);

  // Chuẩn bị dữ liệu cho biểu đồ homestay (bar chart)
  const homestayChartData = {
    labels: revenueByHomestay.slice(0, 5).map(h => {
      const name = h.name.length > 10 ? h.name.substring(0, 10) + '...' : h.name;
      return name;
    }),
    datasets: [
      {
        data: revenueByHomestay.slice(0, 5).map(h => h.revenue / 1000000), // Convert to millions
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#0a7ea4',
    },
  };

  const chartWidth = screenWidth - 64;

  const periodLabels: Record<TimePeriod, string> = {
    day: 'Ngày',
    week: 'Tuần',
    month: 'Tháng',
    quarter: 'Quý',
    year: 'Năm',
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['day', 'week', 'month', 'quarter', 'year'] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <ThemedText
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {periodLabels[period]}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Revenue Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="cash" size={24} color="#0a7ea4" />
            <ThemedText style={styles.cardTitle}>
              Tổng Doanh Thu ({periodLabels[selectedPeriod]})
            </ThemedText>
          </View>
        </View>
        <View style={styles.revenueContainer}>
          <ThemedText style={styles.revenueValue}>
            {getRevenueByPeriod >= 1000000 
              ? `${(getRevenueByPeriod / 1000000).toFixed(1)} triệu đồng`
              : `${(getRevenueByPeriod / 1000).toFixed(1)} nghìn đồng`}
          </ThemedText>
          <ThemedText style={styles.revenueLabel}></ThemedText>
        </View>
      </View>

      {/* Revenue by Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pie-chart" size={20} color="#0a7ea4" />
            <ThemedText style={styles.cardTitle}>Doanh Thu Theo Trạng Thái</ThemedText>
          </View>
        </View>
        {statusChartData.length > 0 ? (
          <>
            <View style={styles.chartWrapper}>
              <PieChart
                data={statusChartData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="revenue"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute={false}
              />
            </View>
            <View style={styles.statusList}>
              {statusChartData.map((item, index) => (
                <View key={index} style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                  <ThemedText style={styles.statusLabel}>{item.name}</ThemedText>
                  <ThemedText style={styles.statusValue}>
                    {item.revenue >= 1000000 
                      ? `${(item.revenue / 1000000).toFixed(1)} triệu đồng`
                      : `${(item.revenue / 1000).toFixed(1)} nghìn đồng`}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyStateText}>Chưa có dữ liệu</ThemedText>
          </View>
        )}
      </View>

      {/* Revenue by Payment Method */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="card" size={20} color="#0a7ea4" />
            <ThemedText style={styles.cardTitle}>Doanh Thu Theo Phương Thức Thanh Toán</ThemedText>
          </View>
        </View>
        {paymentMethodChartData.length > 0 ? (
          <>
            <View style={styles.chartWrapper}>
              <PieChart
                data={paymentMethodChartData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="revenue"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute={false}
              />
            </View>
            <View style={styles.statusList}>
              {paymentMethodChartData.map((item, index) => (
                <View key={index} style={styles.statusItem}>
                  <View style={[styles.statusDot, { backgroundColor: item.color }]} />
                  <ThemedText style={styles.statusLabel}>{item.name}</ThemedText>
                  <ThemedText style={styles.statusValue}>
                    {item.revenue >= 1000000 
                      ? `${(item.revenue / 1000000).toFixed(1)} triệu đồng`
                      : `${(item.revenue / 1000).toFixed(1)} nghìn đồng`}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyStateText}>Chưa có dữ liệu</ThemedText>
          </View>
        )}
      </View>

      {/* Revenue by Homestay */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="business" size={20} color="#0a7ea4" />
            <ThemedText style={styles.cardTitle}>Doanh Thu Theo Homestay</ThemedText>
          </View>
        </View>
        {revenueByHomestay.length > 0 ? (
          <>
            {homestayChartData.labels.length > 0 && (
              <View style={styles.chartWrapper}>
                <BarChart
                  data={homestayChartData}
                  width={chartWidth}
                  height={200}
                  chartConfig={chartConfig}
                  verticalLabelRotation={0}
                  style={styles.chart}
                  yAxisLabel=""
                  yAxisSuffix=""
                  showValuesOnTopOfBars={false}
                />
              </View>
            )}
            <View style={styles.homestayList}>
              {revenueByHomestay.map((item, index) => (
                <View key={item.id} style={styles.homestayItem}>
                  <View style={styles.homestayInfo}>
                    <ThemedText style={styles.homestayRank}>#{index + 1}</ThemedText>
                    <ThemedText style={styles.homestayName} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.homestayRevenue}>
                    {item.revenue >= 1000000 
                      ? `${(item.revenue / 1000000).toFixed(1)} triệu đồng`
                      : `${(item.revenue / 1000).toFixed(1)} nghìn đồng`}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyStateText}>Chưa có dữ liệu</ThemedText>
          </View>
        )}
      </View>

      {/* Revenue by Room */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bed" size={20} color="#0a7ea4" />
            <ThemedText style={styles.cardTitle}>Doanh Thu Theo Phòng</ThemedText>
          </View>
        </View>
        {revenueByRoom.length > 0 ? (
          <View style={styles.roomList}>
            {revenueByRoom.map((item, index) => (
              <View key={item.id} style={styles.roomItem}>
                <View style={styles.roomInfo}>
                  <ThemedText style={styles.roomRank}>#{index + 1}</ThemedText>
                  <View style={styles.roomDetails}>
                    <ThemedText style={styles.roomName} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={styles.roomHomestay} numberOfLines={1}>
                      {item.homestayName}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.roomRevenue}>
                  {item.revenue >= 1000000 
                    ? `${(item.revenue / 1000000).toFixed(1)} triệu đồng`
                    : `${(item.revenue / 1000).toFixed(1)} nghìn đồng`}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bed-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyStateText}>Chưa có dữ liệu</ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.2,
  },
  revenueContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  revenueValue: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '900',
    color: '#0a7ea4',
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  chart: {
    borderRadius: 12,
  },
  statusList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  homestayList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  homestayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  homestayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  homestayRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a7ea4',
    minWidth: 30,
  },
  homestayName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  homestayRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  roomList: {
    marginTop: 8,
    gap: 12,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  roomRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a7ea4',
    minWidth: 30,
  },
  roomDetails: {
    flex: 1,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  roomHomestay: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  roomRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
});

