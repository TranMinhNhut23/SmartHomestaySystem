import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';

interface Stats {
  totalHomestays: number;
  totalRooms: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  activeBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyBookings: number;
  occupancyRate: number;
}

interface HostStatsChartsProps {
  stats: Stats;
  monthlyData?: Array<{ month: string; bookings: number; revenue: number }>;
}

const screenWidth = Dimensions.get('window').width;

export function HostStatsCharts({ stats, monthlyData = [] }: HostStatsChartsProps) {
  // Calculate statistics for charts
  const totalBookingsStatus = 
    (stats.pendingBookings || 0) + 
    (stats.confirmedBookings || 0) + 
    (stats.activeBookings || 0) + 
    (stats.completedBookings || 0);

  const totalMonthlyBookings = monthlyData.reduce((sum, d) => sum + d.bookings, 0);
  const avgMonthlyBookings = monthlyData.length > 0 
    ? Math.round(totalMonthlyBookings / monthlyData.length) 
    : 0;

  const totalMonthlyRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  const avgMonthlyRevenue = monthlyData.length > 0 
    ? totalMonthlyRevenue / monthlyData.length 
    : 0;

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

  // Prepare booking status data for pie chart
  const bookingStatusData = [
    {
      name: 'Chờ Duyệt',
      population: stats.pendingBookings || 0,
      color: '#f59e0b',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Đã Xác Nhận',
      population: stats.confirmedBookings || 0,
      color: '#10b981',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Đang Diễn Ra',
      population: stats.activeBookings || 0,
      color: '#06b6d4',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
    {
      name: 'Đã Hoàn Thành',
      population: stats.completedBookings || 0,
      color: '#22c55e',
      legendFontColor: '#7F7F7F',
      legendFontSize: 11,
    },
  ].filter(item => item.population > 0); // Only show statuses with data

  // Prepare monthly bookings data
  const monthlyBookingsData = {
    labels: monthlyData.length > 0 
      ? monthlyData.map(d => d.month)
      : ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [
      {
        data: monthlyData.length > 0
          ? monthlyData.map(d => d.bookings)
          : [0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Prepare monthly revenue data
  const monthlyRevenueData = {
    labels: monthlyData.length > 0
      ? monthlyData.map(d => d.month)
      : ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
    datasets: [
      {
        data: monthlyData.length > 0
          ? monthlyData.map(d => d.revenue / 1000000) // Convert to millions
          : [0, 0, 0, 0, 0, 0],
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
    fillShadowGradient: '#0a7ea4',
    fillShadowGradientOpacity: 0.1,
  };

  const barChartConfig = {
    ...chartConfig,
    barPercentage: 0.6,
    categoryPercentage: 0.8,
  };

  // Check if there's any booking data
  const hasBookingData = bookingStatusData.length > 0;

  // Calculate chart width for mobile
  const chartWidth = screenWidth - 64; // 32px padding on each side

  return (
    <View style={styles.container}>
      {/* Booking Status Pie Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleRow}>
            <Ionicons name="pie-chart" size={20} color="#0a7ea4" />
            <ThemedText style={styles.chartTitle}>Trạng Thái Đơn Đặt</ThemedText>
          </View>
          {hasBookingData && (
            <View style={styles.summaryBadge}>
              <ThemedText style={styles.summaryBadgeText}>
                Tổng: {totalBookingsStatus}
              </ThemedText>
            </View>
          )}
        </View>
        
        {hasBookingData ? (
          <>
            <View style={styles.chartWrapper}>
              <PieChart
                data={bookingStatusData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
              />
            </View>
            <View style={styles.statusLegend}>
              {bookingStatusData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <ThemedText style={styles.legendText}>
                    {item.name}: {item.population}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="pie-chart-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyChartText}>Chưa có dữ liệu đơn đặt</ThemedText>
          </View>
        )}
      </View>

      {/* Monthly Bookings Line Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleRow}>
            <Ionicons name="trending-up" size={20} color="#0a7ea4" />
            <ThemedText style={styles.chartTitle}>Đơn Đặt Theo Tháng</ThemedText>
          </View>
          {monthlyData.length > 0 && (
            <View style={styles.summaryBadge}>
              <ThemedText style={styles.summaryBadgeText}>
                TB: {avgMonthlyBookings}/tháng
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={monthlyBookingsData}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            segments={4}
          />
        </View>
        {monthlyData.length > 0 && (
          <View style={styles.chartFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <ThemedText style={styles.footerText}>
                Tổng: {totalMonthlyBookings} đơn
              </ThemedText>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="stats-chart-outline" size={14} color="#6b7280" />
              <ThemedText style={styles.footerText}>
                Trung bình: {avgMonthlyBookings} đơn/tháng
              </ThemedText>
            </View>
          </View>
        )}
      </View>

      {/* Monthly Revenue Bar Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleRow}>
            <Ionicons name="cash" size={20} color="#0a7ea4" />
            <ThemedText style={styles.chartTitle}>Doanh Thu Theo Tháng</ThemedText>
          </View>
          {monthlyData.length > 0 && (
            <View style={styles.summaryBadge}>
              <ThemedText style={styles.summaryBadgeText}>
                TB: {formatRevenue(avgMonthlyRevenue)}/tháng
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.chartWrapper}>
          <BarChart
            data={monthlyRevenueData}
            width={chartWidth}
            height={200}
            chartConfig={barChartConfig}
            verticalLabelRotation={0}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=""
            showValuesOnTopOfBars={false}
          />
        </View>
        {monthlyData.length > 0 && (
          <View style={styles.chartFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="wallet-outline" size={14} color="#6b7280" />
              <ThemedText style={styles.footerText}>
                Tổng: {formatRevenue(totalMonthlyRevenue)}
              </ThemedText>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="trending-up-outline" size={14} color="#6b7280" />
              <ThemedText style={styles.footerText}>
                Trung bình: {formatRevenue(avgMonthlyRevenue)}/tháng
              </ThemedText>
            </View>
          </View>
        )}
        <View style={styles.revenueNote}>
          <ThemedText style={styles.noteText}>
            * Đơn vị: Triệu VNĐ
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingHorizontal: 0,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: 0.2,
  },
  summaryBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginVertical: 8,
  },
  chart: {
    borderRadius: 12,
  },
  statusLegend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '45%',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  chartFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: '45%',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  revenueNote: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  noteText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyChartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
});

