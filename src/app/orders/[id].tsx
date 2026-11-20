import * as ImagePicker from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronDown,
  ChevronLeft,
  ImagePlus,
  MapPin,
  Send
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomDrawer, type BottomDrawerHandle } from '@/components/bottom-drawer';
import { OperatorOrderForm } from '@/components/operator-order-form';
import { OrderDetailsDrawer } from '@/components/order-details-drawer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Fonts, Spacing } from '@/constants/theme';
import {
  fetchOrder,
  fetchOrderAttachments,
  fetchOrderMessages,
  fetchPaymentInstructions,
  canCancelOrder,
  cancelOrder as cancelOrderRequest,
  sendOrderMessage,
  sendPaymentReceipt,
  submitOperatorForm as submitOperatorFormRequest,
  subscribeToOrder,
} from '@/lib/api';
import { formatPocketBaseDate } from '@/lib/date';
import { confirmOrderCancellation } from '@/lib/order-actions';
import { showErrorToast, showSuccessToast } from '@/lib/notifications';
import type {
  Order,
  OrderAttachment,
  OrderMessage,
  OrderStatus,
  PaymentInstructions,
} from '@/types/platform';

const statusLabels: Record<OrderStatus, string> = {
  awaiting_operator: 'در انتظار پاسخ متصدی',
  awaiting_payment: 'در انتظار پرداخت',
  payment_review: 'در انتظار تایید پرداخت',
  in_progress: 'در حال انجام',
  awaiting_customer: 'نیازمند پاسخ شما',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
};

function getPaymentStatusLabel(order: Order) {
  if (order.status === 'cancelled') return 'سفارش لغو شده';
  if (order.status === 'payment_review') return 'در انتظار تایید پرداخت';
  if (order.status === 'awaiting_payment') return 'در انتظار پرداخت';
  if (order.orderType === 'free' && order.status === 'awaiting_operator') {
    return order.totalAmount > 0 ? 'در انتظار اقدام متصدی' : 'در انتظار تعیین هزینه';
  }
  if (order.orderType === 'free' && order.status === 'awaiting_customer') {
    return 'نیازمند پاسخ شما';
  }
  if (order.orderType === 'free' && order.totalAmount <= 0) return 'در انتظار تعیین هزینه';
  return 'پرداخت تایید شده';
}

function getPaymentStatusDescription(order: Order) {
  if (order.status === 'cancelled') return 'این سفارش لغو شده است.';
  if (order.status === 'payment_review') {
    return order.statusNote || 'پرداخت شما در انتظار بررسی است. نتیجه را در همین گفت‌وگو پیگیری کنید.';
  }
  if (order.status === 'awaiting_payment') {
    return order.statusNote ||
      'مبلغ را به کارت بانکیِ بخش جزئیات سفارش واریز کنید و تصویر رسید را با دکمهٔ پیوست در همین گفت‌وگو بفرستید.';
  }
  if (order.orderType === 'free' && order.status === 'awaiting_customer') {
    return order.statusNote || 'برای ادامهٔ سفارش، متصدی منتظر پاسخ یا اطلاعات تکمیلی شماست.';
  }
  if (order.orderType === 'free' && order.status === 'awaiting_operator') {
    return order.statusNote || 'متصدی درخواستت را بررسی می‌کند. فرم یا اطلاعات پرداخت در همین سفارش نمایش داده می‌شود.';
  }
  if (order.orderType === 'free' && order.totalAmount <= 0) {
    return 'در همین گفت‌وگو با متصدی دربارهٔ درخواستت صحبت کن. پس از مشخص‌شدن جزئیات، فرم یا اطلاعات پرداخت سفارش در همین صفحه نمایش داده می‌شود.';
  }
  return 'پرداخت تایید شده و سفارش در حال پیگیری است.';
}

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const orderId = Array.isArray(routeId) ? routeId[0] : routeId;
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [payment, setPayment] = useState<PaymentInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataWarning, setDataWarning] = useState('');
  const [messageLoadError, setMessageLoadError] = useState('');
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const scrollRef = useRef<ScrollViewInstance | null>(null);
  const detailsDrawerRef = useRef<BottomDrawerHandle>(null);

  const addMessages = useCallback((incoming: OrderMessage[]) => {
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of incoming) byId.set(message.id, message);
      return [...byId.values()].sort(
        (left, right) => new Date(left.created).getTime() - new Date(right.created).getTime(),
      );
    });
  }, []);

  const loadOrderData = useCallback(async () => {
    if (!orderId) return;
    const [
      orderResult,
      messageResult,
      attachmentsResult,
      paymentResult,
    ] = await Promise.allSettled([
      fetchOrder(orderId),
      fetchOrderMessages(orderId),
      fetchOrderAttachments(orderId),
      fetchPaymentInstructions(),
    ]);

    if (orderResult.status === 'fulfilled') {
      setOrder(orderResult.value);
      setError('');
    } else {
      setError(orderResult.reason instanceof Error ? orderResult.reason.message : String(orderResult.reason));
    }
    const secondaryFailures = [
      messageResult,
      attachmentsResult,
      paymentResult,
    ].filter((result) => result.status === 'rejected');
    setDataWarning(
      secondaryFailures.length
        ? 'بخشی از اطلاعات سفارش بارگیری نشد. اتصال شبکه را بررسی و دوباره به‌روزرسانی کنید.'
        : '',
    );
    if (messageResult.status === 'fulfilled') {
      addMessages(messageResult.value);
      setMessageLoadError('');
    } else {
      console.error('Could not load order messages:', messageResult.reason);
      setMessageLoadError('گفت‌وگو بارگذاری نشد.');
    }
    if (paymentResult.status === 'fulfilled') setPayment(paymentResult.value);
    if (attachmentsResult.status === 'fulfilled') setAttachments(attachmentsResult.value);
    setLoading(false);
  }, [addMessages, orderId]);

  useEffect(() => {
    void Promise.resolve().then(loadOrderData);
  }, [loadOrderData]);

  useEffect(() => {
    if (loading) return undefined;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [loading]);

  useEffect(() => {
    if (!orderId) return undefined;
    const unsubscribe = subscribeToOrder(
      orderId,
      (nextOrder) => {
        setOrder(nextOrder);
      },
      (message) => {
        addMessages([message]);
        setMessageLoadError('');
      },
      () => setDataWarning('اتصال زنده قطع شد؛ به‌روزرسانی دوره‌ای ادامه دارد.'),
    );
    const refresh = setInterval(async () => {
      const [orderResult, messageResult] = await Promise.allSettled([
        fetchOrder(orderId),
        fetchOrderMessages(orderId),
      ]);
      if (orderResult.status === 'fulfilled') setOrder(orderResult.value);
      if (messageResult.status === 'fulfilled') {
        addMessages(messageResult.value);
        setMessageLoadError('');
      }
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(refresh);
    };
  }, [addMessages, orderId]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (order?.status === 'cancelled') Keyboard.dismiss();
  }, [order?.status]);

  async function sendMessage(body = draft.trim(), attachment?: { uri: string; name: string; type: string }) {
    if (!orderId || order?.status === 'cancelled' || (!body && !attachment) || sending) return;
    setSending(true);
    setError('');
    try {
      const message = await sendOrderMessage(orderId, body, attachment);
      addMessages([message]);
      setDraft('');
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setSending(false);
    }
  }

  async function chooseChatImage(asPaymentReceipt = false) {
    const currentOrder = order;
    if (
      !orderId ||
      !currentOrder ||
      currentOrder.status === 'cancelled' ||
      (asPaymentReceipt && currentOrder.status !== 'awaiting_payment') ||
      sending ||
      sharingLocation
    ) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const attachment = {
        uri: asset.uri,
        name: asset.fileName ?? (asPaymentReceipt ? 'payment-receipt' : 'chat-image'),
        type: asset.mimeType ?? new ExpoFile(asset.uri).type,
      };
      if (asPaymentReceipt) {
        setSending(true);
        setError('');
        try {
          const result = await sendPaymentReceipt(orderId, attachment);
          addMessages([result.message]);
          setOrder(result.order);
          setDataWarning(
            result.statusUpdated
              ? ''
              : 'تصویر رسید ارسال شد، اما سرور وضعیت سفارش را تغییر نداد. سرور API را به‌روزرسانی و راه‌اندازی مجدد کنید؛ ارسال دوبارهٔ تصویر لازم نیست.',
          );
          if (result.statusUpdated) {
            showSuccessToast({
              title: 'رسید پرداخت ارسال شد',
              description: 'رسید برای بررسی ارسال شد.',
            });
          }
          requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
        } catch (receiptError) {
          setError(receiptError instanceof Error ? receiptError.message : String(receiptError));
        } finally {
          setSending(false);
        }
        return;
      }
      await sendMessage(
        draft.trim(),
        attachment,
      );
    } catch (imageError) {
      const message = imageError instanceof Error ? imageError.message : String(imageError);
      setError(message);
    }
  }

  async function sendCurrentLocation() {
    if (!orderId || order?.status === 'cancelled' || sending || sharingLocation) return;
    setSharingLocation(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('برای ارسال موقعیت مکانی، اجازهٔ دسترسی به مکان لازم است.');
      }
      const position = await Location.getCurrentPositionAsync();
      const { latitude, longitude } = position.coords;
      const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      await sendMessage(
        [draft.trim(), `موقعیت مکانی: ${mapUrl}`].filter(Boolean).join('\n'),
      );
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : String(locationError));
    } finally {
      setSharingLocation(false);
    }
  }

  async function submitOperatorForm(values: Record<string, unknown>) {
    if (!orderId) return;
    const updatedOrder = await submitOperatorFormRequest(orderId, values);
    setOrder(updatedOrder);
    showSuccessToast({
      title: 'پاسخ فرم ثبت شد',
      description: 'پاسخت برای متصدی ارسال شد.',
    });
  }

  function requestOrderCancellation() {
    if (!order || !orderId || cancelling || !canCancelOrder(order)) return;
    confirmOrderCancellation(order.orderNumber, () => {
      setCancelling(true);
      void cancelOrderRequest(orderId)
        .then((cancelledOrder) => {
          setOrder(cancelledOrder);
          showSuccessToast({
            title: 'سفارش لغو شد',
            description: `سفارش ${cancelledOrder.orderNumber} لغو شد.`,
          });
        })
        .catch((cancelRequestError: unknown) => {
          showErrorToast({
            title: 'لغو سفارش ناموفق بود',
            description:
              cancelRequestError instanceof Error
                ? cancelRequestError.message
                : String(cancelRequestError),
          });
        })
        .finally(() => setCancelling(false));
    });
  }

  if (loading) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <ThemedView style={styles.centered}>
            <ActivityIndicator color="#111111" />
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!order) {
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
          <ThemedView style={styles.centered}>
            <ThemedText type="subtitle" style={styles.centerText}>سفارش در دسترس نیست</ThemedText>
            <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
            <Pressable onPress={() => void loadOrderData()} style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>تلاش دوباره</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const orderPayment = order.paymentInstructions?.available
    ? order.paymentInstructions
    : payment;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}>
          <View style={styles.screenHeader}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}>
              <ChevronLeft size={18} color="#111111" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: orderDetailsExpanded }}
              onPress={() => {
                setOrderDetailsExpanded(true);
                detailsDrawerRef.current?.present();
              }}
              style={styles.orderSummaryButton}>
              <View style={styles.orderSummaryText}>
                <ThemedText type="smallBold" style={styles.rightText} numberOfLines={1}>
                  {order.serviceTitle}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{textAlign: 'right'}} numberOfLines={1}>
                  {statusLabels[order.status]}
                </ThemedText>
              </View>
              <ChevronDown
                size={20}
                color="#555555"
                style={orderDetailsExpanded ? styles.chevronExpanded : undefined}
              />
            </Pressable>
          </View>
          <View style={styles.paymentMessage}>
            <View style={styles.paymentMessageHeader}>
              <ThemedText type="smallBold" style={styles.rightText}>
                وضعیت پرداخت
              </ThemedText>
              <ThemedText type="smallBold" style={styles.paymentStatus}>
                {getPaymentStatusLabel(order)}
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.rightText}>
              {getPaymentStatusDescription(order)}
            </ThemedText>
            {order.status === 'awaiting_payment' && order.totalAmount > 0 ? (
              <>
                <ThemedText type="smallBold" style={styles.paymentAmount}>
                  مبلغ خدمت: {formatPrice(order.totalAmount)}
                </ThemedText>
                {order.orderType !== 'free' || orderPayment?.available ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={sending || sharingLocation}
                    onPress={() => void chooseChatImage(true)}
                    style={[styles.receiptButton, (sending || sharingLocation) && styles.disabled]}>
                    {sending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <ImagePlus size={18} color="#FFFFFF" />
                        <ThemedText type="smallBold" style={styles.receiptButtonText}>
                          ارسال رسید پرداخت
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
                    اطلاعات پرداخت هنوز توسط متصدی ثبت نشده است.
                  </ThemedText>
                )}
              </>
            ) : null}
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
            {dataWarning ? (
              <ThemedText style={styles.warningText}>{dataWarning}</ThemedText>
            ) : null}
            {messageLoadError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadOrderData()}
                style={styles.retryMessages}>
                <ThemedText type="small" style={styles.warningText}>
                  {messageLoadError} برای تلاش دوباره لمس کنید.
                </ThemedText>
              </Pressable>
            ) : null}

            {order.operatorFormSchema?.length &&
            order.status !== 'cancelled' &&
            order.status !== 'completed' ? (
              <OperatorOrderForm
                key={`${JSON.stringify(order.operatorFormSchema)}:${order.operatorFormSubmitted ?? false}`}
                onSubmit={submitOperatorForm}
                response={order.operatorFormData ?? {}}
                schema={order.operatorFormSchema}
                submitted={order.operatorFormSubmitted ?? false}
              />
            ) : null}

            <View style={styles.chatHeading}>
              <ThemedText type="subtitle" style={styles.chatTitle}>گفت‌وگو با متصدی</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">راهنمای شما</ThemedText>
            </View>
            {messages.length ? (
              <View style={styles.chatList}>
                {messages.map((message, index) => (
                  <Animated.View
                    key={message.id}
                    entering={FadeInDown.delay(Math.min(index, 6) * 35).springify()}
                    style={[
                      styles.messageBubble,
                      message.sender === 'guest' ? styles.guestBubble : styles.operatorBubble,
                    ]}>
                    {(() => {
                      const locationUrl = message.body.match(
                        /https:\/\/maps\.google\.com\/\?q=-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/,
                      )?.[0];
                      const messageText = locationUrl
                        ? message.body
                            .replace(/موقعیت مکانی:\s*/g, '')
                            .replace(locationUrl, '')
                            .trim()
                        : message.body;
                      return (
                        <>
                          {messageText ? (
                            <ThemedText
                              style={[
                                styles.messageText,
                                message.sender === 'guest' && styles.guestMessageText,
                              ]}>
                              {messageText}
                            </ThemedText>
                          ) : null}
                          {message.attachmentUrl ? (
                            /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)(\?|$)/i.test(message.attachmentUrl) ? (
                              <Pressable onPress={() => void Linking.openURL(message.attachmentUrl!)}>
                                <Image
                                  source={{ uri: message.attachmentUrl }}
                                  style={styles.chatImage}
                                  resizeMode="cover"
                                />
                              </Pressable>
                            ) : (
                              <Pressable onPress={() => void Linking.openURL(message.attachmentUrl!)}>
                                <ThemedText
                                  type="smallBold"
                                  style={[
                                    styles.messageText,
                                    message.sender === 'guest' && styles.guestMessageText,
                                  ]}>
                                  مشاهدهٔ پیوست
                                </ThemedText>
                              </Pressable>
                            )
                          ) : null}
                          {locationUrl ? (
                            <Pressable
                              accessibilityRole="link"
                              onPress={() => void Linking.openURL(locationUrl)}
                              style={styles.locationLink}>
                              <MapPin
                                size={16}
                                color={message.sender === 'guest' ? '#FFFFFF' : '#111111'}
                              />
                              <ThemedText
                                type="smallBold"
                                style={[
                                  styles.messageText,
                                  message.sender === 'guest' && styles.guestMessageText,
                                ]}>
                                مشاهدهٔ موقعیت
                              </ThemedText>
                            </Pressable>
                          ) : null}
                        </>
                      );
                    })()}
                    <ThemedText
                      type="small"
                      themeColor={message.sender === 'guest' ? undefined : 'textSecondary'}
                      style={[
                        styles.messageTime,
                        message.sender === 'guest' && styles.guestMessageTime,
                      ]}>
                      {formatPocketBaseDate(message.created, { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                  </Animated.View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {order.status === 'cancelled' ? (
            <View style={[styles.cancelledChatNotice, { paddingBottom: insets.bottom + Spacing.two }]}>
              <ThemedText type="small" themeColor="textSecondary">
                این سفارش لغو شده و امکان ارسال پیام وجود ندارد.
              </ThemedText>
            </View>
          ) : (
            <View
              style={[
                styles.composer,
                { paddingBottom: keyboardVisible ? 0 : insets.bottom + Spacing.two },
                keyboardVisible && styles.composerWithKeyboard,
              ]}>
              <View style={styles.messageField}>
                <FormTextInput
                  type="textarea"
                  onChangeText={setDraft}
                  placeholder="پیامت را بنویس..."
                  containerStyle={styles.messageTextInput}
                  inputContainerStyle={styles.messageTextInputContainer}
                  inputStyle={styles.messageInput}
                  value={draft}
                  nativeProps={{ accessibilityLabel: 'پیامت را بنویس...' }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="افزودن تصویر"
                  disabled={sending || sharingLocation}
                  onPress={() => void chooseChatImage()}
                  style={styles.composerAction}>
                  {sending ? (
                    <ActivityIndicator color="#555555" size="small" />
                  ) : (
                    <ImagePlus size={20} color="#555555" />
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="ارسال موقعیت مکانی"
                  disabled={sending || sharingLocation}
                  onPress={() => void sendCurrentLocation()}
                  style={styles.composerAction}>
                  <MapPin size={20} color="#555555" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="ارسال پیام"
                  disabled={sending || sharingLocation || !draft.trim()}
                  onPress={() => void sendMessage()}
                  style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]}>
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Send size={19} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      <BottomDrawer
        ref={detailsDrawerRef}
        onClose={() => setOrderDetailsExpanded(false)}>
        <OrderDetailsDrawer
          attachments={attachments}
          cancelling={cancelling}
          onCancel={requestOrderCancellation}
          onClose={() => detailsDrawerRef.current?.dismiss()}
          order={order}
          payment={orderPayment}
        />
      </BottomDrawer>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E4',
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  messagesScroll: { flex: 1 },
  orderSummaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#F3F3F3',
  },
  orderSummaryText: { flex: 1, alignItems: 'flex-end' },
  chevronExpanded: { transform: [{ rotate: '180deg' }] },
  backButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  rightText: { textAlign: 'right' },
  errorText: { color: '#B42318', textAlign: 'center' },
  warningText: { color: '#9A6700', textAlign: 'center' },
  retryMessages: { alignSelf: 'center', padding: Spacing.one },
  chatHeading: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: { fontSize: 20, lineHeight: 28, textAlign: 'right' },
  chatList: { gap: Spacing.two },
  messageBubble: {
    maxWidth: '88%',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 18,
  },
  guestBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderBottomLeftRadius: 5,
  },
  operatorBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#EEEEEE',
    borderBottomRightRadius: 5,
  },
  messageText: { textAlign: 'right' },
  guestMessageText: { color: '#FFFFFF' },
  messageTime: { textAlign: 'right', fontSize: 12 },
  guestMessageTime: { color: '#FFFFFF' },
  paymentMessage: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8D8D8',
    backgroundColor: '#F3F6FA',
  },
  paymentMessageHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  paymentStatus: { color: '#155EEF', textAlign: 'right' },
  paymentAmount: { textAlign: 'right' },
  receiptButton: {
    minHeight: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#111111',
  },
  receiptButtonText: { color: '#FFFFFF' },
  chatImage: {
    width: 220,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#DDDDDD',
  },
  locationLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Spacing.one,
  },
  composer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    backgroundColor: '#FFFFFF',
  },
  composerWithKeyboard: { paddingTop: 0 },
  cancelledChatNotice: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E4',
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
  messageInput: {
    maxHeight: 110,
    minHeight: 40,
    minWidth: 40,
    paddingLeft: 48,
    paddingRight: Spacing.two,
    paddingVertical: 5,
    color: '#111111',
    fontFamily: Fonts.sans,
    fontSize: 15,
    textAlignVertical: 'center',
  },
  messageTextInput: {
    flex: 1,
  },
  messageTextInputContainer: {
    flex: 1,
    minHeight: 40,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  composerAction: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  disabled: { opacity: 0.55 },
});
