import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './themed-text';
import { aiService } from '@/services/aiService';
import type { AIMessage } from '@/services/aiService';

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  homestayName: string;
  homestayAddress: string;
  homestayId?: string;
  bookingId?: string;
  checkIn?: string;
  checkOut?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChatModal({
  visible,
  onClose,
  homestayName,
  homestayAddress,
  homestayId,
  bookingId,
  checkIn,
  checkOut,
}: AIChatModalProps) {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<AIMessage[]>([]);
  const [systemPromptAdded, setSystemPromptAdded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Tính số ngày
  const numberOfDays = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  // Khởi tạo cuộc trò chuyện khi modal mở
  useEffect(() => {
    if (visible && messages.length === 0) {
      // Khởi tạo conversation history với system prompt
      if (conversationHistory.length === 0) {
        const systemMessage: AIMessage = {
          role: 'system',
          content: aiService.getSystemPrompt(homestayName, homestayAddress),
        };
        setConversationHistory([systemMessage]);
      }

      let welcomeText = 'Xin chào! Tôi là trợ lý du lịch AI của bạn. ';
      
      if (checkIn && checkOut) {
        welcomeText += `Tôi thấy bạn đã chọn ngày từ ${checkIn} đến ${checkOut}. Tôi sẽ giúp bạn tạo lịch trình du lịch chi tiết cho homestay "${homestayName}". Bạn có muốn tôi gợi ý lịch trình ngay bây giờ không?`;
      } else {
        welcomeText += `Tôi sẽ giúp bạn tạo lịch trình du lịch chi tiết cho homestay "${homestayName}" tại ${homestayAddress}. Hãy cho tôi biết ngày bạn muốn đến (hoặc bạn có thể chọn ngày trong modal đặt phòng trước).`;
      }

      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: welcomeText,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [visible, checkIn, checkOut, homestayName, homestayAddress]);

  // Auto scroll khi có message mới
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (content?: string) => {
    const textToSend = content || messageText.trim();
    if (!textToSend || isLoading) return;

    // Kiểm tra câu hỏi có liên quan đến du lịch không (trừ khi là auto generate)
    const shouldAutoGenerate = conversationHistory.length === 0 && 
      (textToSend.toLowerCase().includes('gợi ý') || 
       textToSend.toLowerCase().includes('lịch trình') || 
       textToSend.toLowerCase().includes('lên kế hoạch') ||
       textToSend.toLowerCase().includes('đề xuất') ||
       textToSend.toLowerCase().includes('có') ||
       textToSend === '');

    // Kiểm tra validation trước khi gửi (trừ auto generate)
    if (!shouldAutoGenerate && !aiService.isTravelRelated(textToSend)) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Xin lỗi, tôi chỉ có thể hỗ trợ bạn về các vấn đề liên quan đến du lịch, homestay và lịch trình chuyến đi. Bạn có câu hỏi nào về du lịch không?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, {
        role: 'user',
        content: textToSend,
        timestamp: new Date(),
      }, errorMessage]);
      setMessageText('');
      return;
    }

    // Thêm message của user vào UI
    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setMessageText('');


    setIsLoading(true);

    try {
      let promptToSend = textToSend;

      // Nếu là request đầu tiên và có checkIn/checkOut, tự động tạo prompt gợi ý lịch trình
      if (shouldAutoGenerate && checkIn && checkOut) {
        // Sử dụng async version với database context nếu có homestayId
        if (homestayId) {
          promptToSend = await aiService.createItineraryPrompt(
            homestayId,
            checkIn,
            checkOut,
            numberOfDays,
            undefined, // preferences
            bookingId
          );
        } else {
          // Fallback: tạo prompt đơn giản nếu không có homestayId
          promptToSend = `Bạn là một trợ lý du lịch thông minh chuyên gợi ý lịch trình cho khách du lịch. 
Hãy tạo lịch trình chi tiết cho chuyến đi của tôi:

📍 **Thông tin homestay:**
- Tên: ${homestayName}
- Địa chỉ: ${homestayAddress}

📅 **Thông tin chuyến đi:**
- Ngày nhận phòng: ${checkIn}
- Ngày trả phòng: ${checkOut}
- Số ngày: ${numberOfDays} ngày ${numberOfDays > 1 ? 'đêm' : ''}

Hãy tạo lịch trình chi tiết bao gồm:
1. Các điểm tham quan nổi tiếng gần homestay
2. Nhà hàng/quán ăn ngon trong khu vực
3. Hoạt động vui chơi giải trí phù hợp
4. Phương tiện di chuyển và lộ trình tối ưu
5. Lưu ý và mẹo du lịch

Lịch trình nên được chia theo ngày một cách chi tiết và dễ thực hiện.`;
        }
      } else if (shouldAutoGenerate && (!checkIn || !checkOut)) {
        // Nếu chưa có ngày, hỏi user về ngày tháng
        promptToSend = `Tôi muốn biết thêm thông tin về chuyến đi của bạn để tạo lịch trình phù hợp. Bạn có thể cho tôi biết:
1. Ngày bạn muốn nhận phòng
2. Ngày bạn muốn trả phòng
3. Số lượng người đi cùng
4. Sở thích và hoạt động bạn quan tâm (ví dụ: ẩm thực, văn hóa, giải trí, tham quan, v.v.)

Hoặc bạn có thể mở modal đặt phòng để chọn ngày trước, sau đó quay lại đây để tôi tạo lịch trình chi tiết hơn.`;
      }

      // Cập nhật conversation history (giữ system prompt nếu có)
      const updatedHistory: AIMessage[] = [
        ...conversationHistory,
        {
          role: 'user',
          content: promptToSend,
        },
      ];

      setConversationHistory(updatedHistory);

      // Gọi AI service với thông tin homestay và database context
      // System prompt sẽ được tự động thêm nếu chưa có trong conversation
      // Nếu có homestayId hoặc bookingId, sẽ tự động fetch dữ liệu từ database
      const response = await aiService.chat(
        updatedHistory, 
        'x-ai/grok-4.1-fast:free', 
        true,
        {
          homestayName,
          homestayAddress,
          homestayId,
          bookingId,
          includeReviews: true, // Luôn include reviews để AI có thông tin đánh giá
          includeCoupons: false, // Có thể bật nếu muốn
        }
      );

      // Thêm response vào conversation history (có reasoning_details)
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: response.content,
        reasoning_details: response.reasoning_details,
      };

      const newHistory = [...updatedHistory, assistantMessage];
      setConversationHistory(newHistory);

      // Thêm message của AI vào UI
      const aiChatMessage: ChatMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiChatMessage]);
    } catch (error: any) {
      console.error('Error sending message to AI:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Xin lỗi, có lỗi xảy ra: ${error.message || 'Không thể kết nối với AI service'}. Vui lòng kiểm tra lại API key hoặc thử lại sau.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setConversationHistory([]);
    setMessageText('');
    onClose();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Format markdown text thành các component React Native
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Split text by lines để xử lý từng dòng
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (!line.trim()) {
        return <View key={lineIndex} style={styles.lineBreak} />;
      }

      // Check for headings
      if (line.startsWith('### ')) {
        return (
          <ThemedText key={lineIndex} style={styles.heading3}>
            {line.replace('### ', '')}
          </ThemedText>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <ThemedText key={lineIndex} style={styles.heading2}>
            {line.replace('## ', '')}
          </ThemedText>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <ThemedText key={lineIndex} style={styles.heading1}>
            {line.replace('# ', '')}
          </ThemedText>
        );
      }

      // Check for list items
      if (line.match(/^\*\s+/)) {
        const content = line.replace(/^\*\s+/, '');
        return (
          <View key={lineIndex} style={styles.listItemContainer}>
            <ThemedText style={styles.listBullet}>•</ThemedText>
            <ThemedText style={styles.listItemText}>{renderInlineFormatting(content)}</ThemedText>
          </View>
        );
      }

      // Check for numbered list
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        return (
          <View key={lineIndex} style={styles.listItemContainer}>
            <ThemedText style={styles.listNumber}>{numberedMatch[1]}.</ThemedText>
            <ThemedText style={styles.listItemText}>{renderInlineFormatting(numberedMatch[2])}</ThemedText>
          </View>
        );
      }

      // Regular text with inline formatting
      return (
        <ThemedText key={lineIndex} style={styles.regularText}>
          {renderInlineFormatting(line)}
        </ThemedText>
      );
    });
  };

  // Render inline formatting (bold, emojis)
  const renderInlineFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    // Match bold text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(
          <ThemedText key={key++} style={styles.regularText}>
            {text.substring(lastIndex, match.index)}
          </ThemedText>
        );
      }
      // Add bold text
      parts.push(
        <ThemedText key={key++} style={styles.boldText}>
          {match[1]}
        </ThemedText>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <ThemedText key={key++} style={styles.regularText}>
          {text.substring(lastIndex)}
        </ThemedText>
      );
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="sparkles" size={24} color="#0a7ea4" />
              </View>
              <View style={styles.headerTextContainer}>
                <ThemedText style={styles.headerTitle}>Trợ lý du lịch AI</ThemedText>
                <ThemedText style={styles.headerSubtitle}>Gợi ý lịch trình thông minh</ThemedText>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#11181C" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#94a3b8" />
                <ThemedText style={styles.emptyText}>
                  Bắt đầu trò chuyện để nhận gợi ý lịch trình
                </ThemedText>
              </View>
            ) : (
              messages.map((message, index) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <Animated.View
                    key={index}
                    style={[
                      styles.messageWrapper,
                      isAssistant ? styles.assistantMessageWrapper : styles.userMessageWrapper,
                    ]}
                  >
                    {isAssistant && (
                      <View style={styles.assistantAvatar}>
                        <LinearGradient
                          colors={['#0a7ea4', '#0d8bb8']}
                          style={styles.avatarGradient}
                        >
                          <Ionicons name="sparkles" size={18} color="#fff" />
                        </LinearGradient>
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        isAssistant ? styles.assistantMessage : styles.userMessage,
                        isAssistant && styles.assistantMessageShadow,
                      ]}
                    >
                      {isAssistant ? (
                        <View style={styles.assistantMessageContent}>
                          {renderFormattedText(message.content)}
                        </View>
                      ) : (
                        <ThemedText style={styles.userMessageText}>
                          {message.content}
                        </ThemedText>
                      )}
                      <View style={styles.messageFooter}>
                        <ThemedText style={[
                          styles.messageTime,
                          isAssistant ? styles.assistantMessageTime : styles.userMessageTime,
                        ]}>
                          {formatTime(message.timestamp)}
                        </ThemedText>
                        {isAssistant && (
                          <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={10} color="#0a7ea4" />
                            <ThemedText style={styles.aiBadgeText}>AI</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                    {!isAssistant && (
                      <View style={styles.userAvatar}>
                        <LinearGradient
                          colors={['#0a7ea4', '#0d8bb8']}
                          style={styles.avatarGradient}
                        >
                          <Ionicons name="person" size={18} color="#fff" />
                        </LinearGradient>
                      </View>
                    )}
                  </Animated.View>
                );
              })
            )}
            {isLoading && (
              <View style={[styles.messageWrapper, styles.assistantMessageWrapper]}>
                <View style={styles.assistantAvatar}>
                  <LinearGradient
                    colors={['#0a7ea4', '#0d8bb8']}
                    style={styles.avatarGradient}
                  >
                    <Ionicons name="sparkles" size={18} color="#fff" />
                  </LinearGradient>
                </View>
                <View style={[styles.messageBubble, styles.assistantMessage, styles.assistantMessageShadow]}>
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#0a7ea4" />
                    <ThemedText style={[styles.assistantMessageText, styles.loadingText]}>
                      AI đang suy nghĩ...
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn hoặc hỏi về lịch trình..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={() => sendMessage()}
              disabled={!messageText.trim() || isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
    textAlign: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  assistantMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 20,
  },
  userMessage: {
    backgroundColor: '#0a7ea4',
    borderBottomRightRadius: 6,
    shadowColor: '#0a7ea4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  assistantMessage: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  assistantMessageShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  assistantMessageContent: {
    gap: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  assistantMessageText: {
    color: '#11181C',
    fontSize: 15,
    lineHeight: 22,
  },
  regularText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#11181C',
  },
  boldText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: '#11181C',
  },
  heading1: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a7ea4',
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 28,
  },
  heading2: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a7ea4',
    marginTop: 10,
    marginBottom: 6,
    lineHeight: 26,
  },
  heading3: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 24,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  listBullet: {
    fontSize: 18,
    color: '#0a7ea4',
    fontWeight: '700',
    marginTop: 2,
  },
  listNumber: {
    fontSize: 15,
    color: '#0a7ea4',
    fontWeight: '700',
    marginTop: 2,
    minWidth: 20,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#11181C',
  },
  numberedItem: {
    fontSize: 15,
    lineHeight: 22,
    color: '#11181C',
    marginLeft: 8,
  },
  emoji: {
    fontSize: 18,
  },
  lineBreak: {
    height: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontStyle: 'italic',
    color: '#64748b',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  assistantMessageTime: {
    color: '#94a3b8',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0a7ea4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#11181C',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.5,
  },
});

