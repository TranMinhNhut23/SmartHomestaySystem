import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HostRequestTermsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const terms = [
    {
      title: '1. Điều kiện cơ bản',
      content: [
        'Bạn phải đủ 18 tuổi trở lên và có quyền công dân hợp lệ.',
        'Bạn phải có căn cước công dân (CCCD) hoặc chứng minh thư nhân dân (CMND) còn hiệu lực.',
        'Bạn phải sở hữu hoặc có quyền quản lý hợp pháp homestay mà bạn muốn đăng ký.',
      ],
    },
    {
      title: '2. Nghĩa vụ của Host',
      content: [
        'Cung cấp thông tin chính xác và trung thực về homestay.',
        'Đảm bảo chất lượng dịch vụ và tuân thủ các tiêu chuẩn đã cam kết.',
        'Chịu trách nhiệm về tất cả các hoạt động kinh doanh liên quan đến homestay.',
        'Tuân thủ các quy định về an toàn, vệ sinh và môi trường.',
        'Xử lý kịp thời và chuyên nghiệp các yêu cầu và phàn nàn của khách hàng.',
      ],
    },
    {
      title: '3. Quyền lợi của Host',
      content: [
        'Được đăng ký và quản lý homestay trên nền tảng.',
        'Được tiếp cận với cộng đồng khách hàng rộng lớn.',
        'Được hỗ trợ kỹ thuật và hướng dẫn sử dụng hệ thống.',
        'Được hưởng các chính sách ưu đãi dành cho đối tác.',
      ],
    },
    {
      title: '4. Quy trình duyệt',
      content: [
        'Yêu cầu của bạn sẽ được xem xét bởi đội ngũ quản trị viên.',
        'Thời gian xử lý thông thường từ 3-7 ngày làm việc.',
        'Bạn sẽ nhận được thông báo kết quả qua email hoặc tin nhắn trên ứng dụng.',
        'Nếu bị từ chối, bạn có thể xem lý do và nộp lại đơn sau 30 ngày.',
      ],
    },
    {
      title: '5. Lưu ý quan trọng',
      content: [
        'Thông tin bạn cung cấp phải hoàn toàn chính xác. Việc cung cấp thông tin sai có thể dẫn đến việc từ chối đơn hoặc khóa tài khoản.',
        'Ảnh CCCD phải rõ ràng, đầy đủ thông tin và còn hiệu lực.',
        'Chứng minh có homestay có thể là: địa chỉ cụ thể, hình ảnh, giấy tờ pháp lý liên quan.',
      ],
    },
    {
      title: '6. Bảo mật thông tin',
      content: [
        'Tất cả thông tin cá nhân và tài liệu của bạn sẽ được bảo mật tuyệt đối.',
        'Chúng tôi chỉ sử dụng thông tin này cho mục đích xác minh và quản lý tài khoản.',
        'Thông tin sẽ không được chia sẻ với bên thứ ba mà không có sự đồng ý của bạn.',
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#151718' : '#f5f5f5' }]}>
      <LinearGradient
        colors={['#0a7ea4', '#0d8bb8']}
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Điều Khoản Trở Thành Host</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.termsContainer, { backgroundColor: isDark ? '#1e293b' : '#fff' }]}>
          <View style={styles.introSection}>
            <Ionicons name="document-text" size={48} color="#0a7ea4" />
            <ThemedText style={styles.introTitle}>Điều Khoản và Quy Định</ThemedText>
            <ThemedText style={styles.introText}>
              Vui lòng đọc kỹ các điều khoản dưới đây trước khi gửi yêu cầu trở thành host.
            </ThemedText>
          </View>

          {terms.map((term, index) => (
            <View key={index} style={styles.termSection}>
              <ThemedText style={styles.termTitle}>{term.title}</ThemedText>
              {term.content.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.termItem}>
                  <Ionicons name="ellipse" size={6} color="#0a7ea4" style={styles.bullet} />
                  <ThemedText style={styles.termContent}>{item}</ThemedText>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.footerSection}>
            <Ionicons name="information-circle" size={24} color="#f59e0b" />
            <ThemedText style={styles.footerText}>
              Bằng việc đồng ý với các điều khoản này, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ
              tất cả các quy định trên.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  termsContainer: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#11181C',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  introText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  termSection: {
    marginBottom: 28,
  },
  termTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a7ea4',
    marginBottom: 16,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  bullet: {
    marginTop: 8,
  },
  termContent: {
    flex: 1,
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
    fontWeight: '500',
  },
});





