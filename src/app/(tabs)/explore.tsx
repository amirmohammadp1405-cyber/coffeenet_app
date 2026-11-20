import { router } from 'expo-router';
import { Send, Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_CONTENT_GAP,
  TAB_BAR_HEIGHT,
} from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Fonts, Spacing } from '@/constants/theme';
import { sendAssistantMessage } from '@/lib/api';
import type {
  AssistantChatMessage,
  AssistantSuggestedService,
} from '@/lib/api';

type ChatMessage = AssistantChatMessage & {
  id: string;
  suggestions: AssistantSuggestedService[];
};

const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'سلام! من متصدی هوشمند کافینت هستم. چه کاری برات انجام بدم؟',
  suggestions: [],
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
}

function getServicePrice(service: AssistantSuggestedService) {
  const total =
    service.basePrice +
    service.priceBreakdown.reduce((sum, item) => sum + item.amount, 0);
  return total > 0 ? formatPrice(total) : 'هزینه پس از بررسی مشخص می‌شود';
}

export default function SmartClerkScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const nextMessageId = useRef(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length, sending]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError('');
    try {
      const history: AssistantChatMessage[] = [
        ...messages.slice(-18).map(({ role, content }) => ({ role, content })),
        { role: 'user', content: text },
      ];
      const response = await sendAssistantMessage(history);
      nextMessageId.current += 1;
      const userMessage: ChatMessage = {
        id: `user-${nextMessageId.current}`,
        role: 'user',
        content: text,
        suggestions: [],
      };
      nextMessageId.current += 1;
      const assistantMessage: ChatMessage = {
        id: `assistant-${nextMessageId.current}`,
        role: 'assistant',
        content: response.reply,
        suggestions: response.suggestions,
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setDraft('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setSending(false);
    }
  }

  function startOrder(service: AssistantSuggestedService) {
    router.push({ pathname: '/orders/new', params: { serviceId: service.id } });
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={21} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="subtitle" style={styles.title}>
                متصدی هوشمند
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                راهنمای خدمات کافینت
              </ThemedText>
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {messages.map((message, index) => (
              <Animated.View
                key={message.id}
                entering={FadeInDown.delay(Math.min(index, 6) * 35).springify()}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}>
                <ThemedText
                  style={[
                    styles.messageText,
                    message.role === 'user' && styles.userMessageText,
                  ]}>
                  {message.content}
                </ThemedText>
                {message.suggestions.length > 0 ? (
                  <View style={styles.suggestions}>
                    {message.suggestions.map((service) => (
                      <View key={service.id} style={styles.suggestionCard}>
                        <ThemedText type="smallBold" style={styles.suggestionTitle}>
                          {service.title}
                        </ThemedText>
                        {service.summary ? (
                          <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            style={styles.suggestionSummary}>
                            {service.summary}
                          </ThemedText>
                        ) : null}
                        <View style={styles.suggestionFooter}>
                          <ThemedText type="small" style={styles.suggestionPrice}>
                            {getServicePrice(service)}
                          </ThemedText>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => startOrder(service)}
                            style={({ pressed }) => [
                              styles.orderButton,
                              pressed && styles.pressed,
                            ]}>
                            <ThemedText type="smallBold" style={styles.orderButtonText}>
                              ثبت سفارش
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            ))}
            {sending ? (
              <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#555555" />
                <ThemedText type="small" themeColor="textSecondary">
                  در حال آماده‌کردن پاسخ...
                </ThemedText>
              </View>
            ) : null}
            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          </ScrollView>

          <View
            style={[
              styles.composer,
              {
                paddingBottom: keyboardVisible
                  ? Spacing.two
                  : insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + TAB_BAR_CONTENT_GAP,
              },
            ]}>
            <View style={styles.messageField}>
              <FormTextInput
                type="textarea"
                onChangeText={setDraft}
                placeholder="پیامت را بنویس..."
                clearable={false}
                containerStyle={styles.messageTextInput}
                inputContainerStyle={styles.messageTextInputContainer}
                inputStyle={styles.messageInput}
                value={draft}
                nativeProps={{ accessibilityLabel: 'پیامت را بنویس...' }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="ارسال پیام"
                disabled={!draft.trim() || sending}
                onPress={() => void sendMessage()}
                style={({ pressed }) => [
                  styles.sendButton,
                  (!draft.trim() || sending) && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Send size={19} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E4',
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#111111',
  },
  headerText: { flex: 1, alignItems: 'flex-end' },
  title: { fontSize: 20, lineHeight: 28, textAlign: 'right' },
  subtitle: { textAlign: 'right' },
  messagesScroll: { flex: 1 },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  messageBubble: {
    maxWidth: '90%',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderBottomLeftRadius: 5,
  },
  assistantBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#EEEEEE',
    borderBottomRightRadius: 5,
  },
  messageText: { textAlign: 'right', lineHeight: 24 },
  userMessageText: { color: '#FFFFFF' },
  suggestions: { gap: Spacing.two },
  suggestionCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  suggestionTitle: { textAlign: 'right' },
  suggestionSummary: { textAlign: 'right', lineHeight: 21 },
  suggestionFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  suggestionPrice: { flex: 1, textAlign: 'right' },
  orderButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#111111',
  },
  orderButtonText: { color: '#FFFFFF' },
  loadingBubble: { flexDirection: 'row-reverse', alignItems: 'center' },
  errorText: {
    alignSelf: 'stretch',
    padding: Spacing.two,
    color: '#B42318',
    textAlign: 'center',
  },
  composer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    backgroundColor: '#FFFFFF',
  },
  messageField: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D8D8D8',
    backgroundColor: '#FFFFFF',
  },
  messageTextInput: { flex: 1 },
  messageTextInputContainer: {
    flex: 1,
    minHeight: 40,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  messageInput: {
    maxHeight: 110,
    minHeight: 40,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
    paddingVertical: 5,
    color: '#111111',
    fontFamily: Fonts.sans,
    fontSize: 15,
    textAlignVertical: 'center',
  },
  sendButton: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#111111',
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
});
