import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
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

interface Booking {
  _id: string;
  guest?: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  guestInfo?: {
    fullName?: string;
    email?: string;
  };
  couponCode?: string;
  discountAmount?: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

interface HostStatsChartsProps {
  stats: Stats;
  bookings?: Booking[];
}

const screenWidth = Dimensions.get('window').width;

export function HostStatsCharts({ stats, bookings = [] }: HostStatsChartsProps) {
  // Calculate statistics for charts
  const totalBookingsStatus = 
    (stats.pendingBookings || 0) + 
    (stats.confirmedBookings || 0) + 
    (stats.activeBookings || 0) + 
    (stats.completedBookings || 0);

  // Thống kê người dùng homestay
  const userStats = useMemo(() => {
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    const uniqueUsers = new Set<string>();
    const userBookingCount: Record<string, number> = {};
    const userRevenue: Record<string, number> = {};

    safeBookings.forEach((booking: Booking) => {
      if (booking.guest?._id) {
        const userId = booking.guest._id;
        uniqueUsers.add(userId);
        
        if (!userBookingCount[userId]) {
          userBookingCount[userId] = 0;
          userRevenue[userId] = 0;
        }
        
        userBookingCount[userId]++;
        if (booking.paymentStatus === 'paid') {
          userRevenue[userId] += booking.totalPrice || 0;
        }
      }
    });

    // Helper function to get user name from booking
    const getUserName = (booking: Booking): string => {
      // Try guest.fullName first
      if (booking.guest?.fullName) {
        return booking.guest.fullName.trim();
      }
      // Try guestInfo.fullName
      if (booking.guestInfo?.fullName) {
        return booking.guestInfo.fullName.trim();
      }
      // Try guest.email (use part before @)
      if (booking.guest?.email) {
        const emailPart = booking.guest.email.split('@')[0];
        return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
      }
      // Try guestInfo.email
      if (booking.guestInfo?.email) {
        const emailPart = booking.guestInfo.email.split('@')[0];
        return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
      }
      return '';
    };

    // Top users by bookings
    const topUsersByBookings = Object.entries(userBookingCount)
      .map(([userId, count]) => {
        const booking = safeBookings.find((b: Booking) => b.guest?._id === userId);
        const name = booking ? getUserName(booking) : '';
        return {
          userId,
          count,
          revenue: userRevenue[userId] || 0,
          name: name || `Khách hàng ${userId.substring(0, 6)}`,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top users by revenue
    const topUsersByRevenue = Object.entries(userRevenue)
      .map(([userId, revenue]) => {
        const booking = safeBookings.find((b: Booking) => b.guest?._id === userId);
        const name = booking ? getUserName(booking) : '';
        return {
          userId,
          revenue,
          count: userBookingCount[userId] || 0,
          name: name || `Khách hàng ${userId.substring(0, 6)}`,
        };
      })
      .filter(u => u.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalUniqueUsers: uniqueUsers.size,
      topUsersByBookings,
      topUsersByRevenue,
    };
  }, [bookings]);

  // Thống kê khuyến mãi
  const promotionStats = useMemo(() => {
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    const couponUsage: Record<string, { count: number; totalDiscount: number; totalRevenue: number }> = {};
    let totalDiscountAmount = 0;
    let bookingsWithCoupon = 0;

    safeBookings.forEach((booking: Booking) => {
      if (booking.couponCode && booking.discountAmount && booking.discountAmount > 0) {
        bookingsWithCoupon++;
        totalDiscountAmount += booking.discountAmount;

        const code = booking.couponCode.toUpperCase();
        if (!couponUsage[code]) {
          couponUsage[code] = { count: 0, totalDiscount: 0, totalRevenue: 0 };
        }
        couponUsage[code].count++;
        couponUsage[code].totalDiscount += booking.discountAmount;
        if (booking.paymentStatus === 'paid') {
          couponUsage[code].totalRevenue += booking.totalPrice || 0;
        }
      }
    });

    // Top coupons by usage
    const topCoupons = Object.entries(couponUsage)
      .map(([code, data]) => ({
        code,
        ...data,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDiscountAmount,
      bookingsWithCoupon,
      totalBookings: safeBookings.length,
      couponUsageRate: safeBookings.length > 0 
        ? Math.round((bookingsWithCoupon / safeBookings.length) * 100) 
        : 0,
      topCoupons,
    };
  }, [bookings]);

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

  // Prepare top users by bookings data for bar chart
  const topUsersChartData = {
    labels: userStats.topUsersByBookings.map((u) => {
      // Hiển thị tên đầy đủ, chỉ rút ngắn nếu quá dài (15 ký tự)
      if (u.name.length > 15) {
        return u.name.substring(0, 12) + '...';
      }
      return u.name;
    }),
    datasets: [
      {
        data: userStats.topUsersByBookings.map(u => u.count),
      },
    ],
  };

  // Prepare top coupons data for bar chart
  const topCouponsChartData = {
    labels: promotionStats.topCoupons.map(c => {
      // Hiển thị đầy đủ mã, chỉ rút ngắn nếu quá dài (12 ký tự)
      if (c.code.length > 12) {
        return c.code.substring(0, 10) + '..';
      }
      return c.code;
    }),
    datasets: [
      {
        data: promotionStats.topCoupons.map(c => c.count),
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
                absolute={false}
              />
            </View>
            <View style={styles.statusLegend}>
              {bookingStatusData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <View style={styles.legendContent}>
                    <ThemedText style={styles.legendText}>
                      {item.name}
                    </ThemedText>
                    <ThemedText style={styles.legendValue}>
                      {item.population} đơn
                    </ThemedText>
                  </View>
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

      {/* Người Dùng Homestay */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleRow}>
            <Ionicons name="people" size={20} color="#0a7ea4" />
            <ThemedText style={styles.chartTitle}>Người Dùng Homestay</ThemedText>
          </View>
          <View style={styles.summaryBadge}>
            <ThemedText style={styles.summaryBadgeText}>
              {userStats.totalUniqueUsers} khách hàng
            </ThemedText>
          </View>
        </View>
        {userStats.topUsersByBookings.length > 0 ? (
          <>
            <View style={styles.chartWrapper}>
              <BarChart
                data={topUsersChartData}
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
            <View style={styles.chartFooter}>
              <View style={styles.footerItem}>
                <Ionicons name="people-outline" size={14} color="#6b7280" />
                <ThemedText style={styles.footerText}>
                  Tổng: {userStats.totalUniqueUsers} khách hàng
                </ThemedText>
              </View>
            </View>
            <View style={styles.userList}>
              <ThemedText style={styles.sectionSubtitle}>Top 5 Khách Hàng Theo Số Đơn</ThemedText>
              {userStats.topUsersByBookings.map((user, index) => (
                <View key={user.userId} style={styles.userItem}>
                  <View style={styles.userInfo}>
                    <ThemedText style={styles.userRank}>#{index + 1}</ThemedText>
                    <View style={styles.userDetails}>
                      <ThemedText style={styles.userName} numberOfLines={1}>
                        {user.name}
                      </ThemedText>
                      <ThemedText style={styles.userStats}>
                        {user.count} đơn • {formatRevenue(user.revenue)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="people-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyChartText}>Chưa có dữ liệu khách hàng</ThemedText>
          </View>
        )}
      </View>

      {/* Thống Kê Khuyến Mãi */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <View style={styles.chartTitleRow}>
            <Ionicons name="gift" size={20} color="#0a7ea4" />
            <ThemedText style={styles.chartTitle}>Thống Kê Khuyến Mãi</ThemedText>
          </View>
          <View style={styles.summaryBadge}>
            <ThemedText style={styles.summaryBadgeText}>
              {promotionStats.couponUsageRate}% sử dụng
            </ThemedText>
          </View>
        </View>
        {promotionStats.topCoupons.length > 0 ? (
          <>
            <View style={styles.chartWrapper}>
              <BarChart
                data={topCouponsChartData}
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
            <View style={styles.chartFooter}>
              <View style={styles.footerItem}>
                <Ionicons name="gift-outline" size={14} color="#6b7280" />
                <ThemedText style={styles.footerText}>
                  {promotionStats.bookingsWithCoupon} đơn sử dụng mã
                </ThemedText>
              </View>
              <View style={styles.footerItem}>
                <Ionicons name="cash-outline" size={14} color="#6b7280" />
                <ThemedText style={styles.footerText}>
                  Tổng giảm: {formatRevenue(promotionStats.totalDiscountAmount)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.couponList}>
              <ThemedText style={styles.sectionSubtitle}>Top 5 Mã Khuyến Mãi</ThemedText>
              {promotionStats.topCoupons.map((coupon, index) => (
                <View key={coupon.code} style={styles.couponItem}>
                  <View style={styles.couponInfo}>
                    <ThemedText style={styles.couponRank}>#{index + 1}</ThemedText>
                    <View style={styles.couponDetails}>
                      <ThemedText style={styles.couponCode} numberOfLines={1}>
                        {coupon.code}
                      </ThemedText>
                      <ThemedText style={styles.couponStats}>
                        {coupon.count} lần • Giảm {formatRevenue(coupon.totalDiscount)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="gift-outline" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyChartText}>Chưa có dữ liệu khuyến mãi</ThemedText>
          </View>
        )}
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
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    marginVertical: 12,
  },
  chart: {
    borderRadius: 12,
  },
  statusLegend: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: '45%',
    paddingVertical: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  legendContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  chartFooter: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: '45%',
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  revenueNote: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
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
  userList: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a7ea4',
    minWidth: 30,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  couponList: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  couponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  couponInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  couponRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a7ea4',
    minWidth: 30,
  },
  couponDetails: {
    flex: 1,
  },
  couponCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  couponStats: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
});

