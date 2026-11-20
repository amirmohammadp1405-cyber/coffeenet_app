import { router, useFocusEffect } from 'expo-router';
import { PackageOpen } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_CONTENT_GAP,
  TAB_BAR_HEIGHT,
} from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { canCancelOrder, cancelOrder, fetchLocalOrders } from '@/lib/api';
import { formatPocketBaseDate } from '@/lib/date';
import { showErrorToast, showSuccessToast } from '@/lib/notifications';
import { confirmOrderCancellation } from '@/lib/order-actions';
import type { Order, OrderStatus } from '@/types/platform';

const statusLabels: Record<OrderStatus, string> = {
  awaiting_operator: 'در انتظار پاسخ متصدی',
  awaiting_payment: 'در انتظار پرداخت',
  payment_review: 'در انتظار تایید پرداخت',
  in_progress: 'در حال انجام',
  awaiting_customer: 'نیازمند پاسخ شما',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
}

function getOrderStatusLabel(order: Order) {
  return statusLabels[order.status];
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await fetchLocalOrders());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  function requestOrderCancellation(order: Order) {
    if (cancellingOrderId) return;
    confirmOrderCancellation(order.orderNumber, () => {
      setCancellingOrderId(order.id);
      void (async () => {
        try {
          const cancelledOrder = await cancelOrder(order.id);
          setOrders((current) =>
            current.map((item) => (item.id === cancelledOrder.id ? cancelledOrder : item)),
          );
          showSuccessToast({
            title: 'سفارش لغو شد',
            description: `سفارش ${cancelledOrder.orderNumber} لغو شد.`,
          });
        } catch (cancelError) {
          showErrorToast({
            title: 'لغو سفارش ناموفق بود',
            description: cancelError instanceof Error ? cancelError.message : String(cancelError),
          });
        } finally {
          setCancellingOrderId(null);
        }
      })();
    });
  }

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom +
                TAB_BAR_HEIGHT +
                TAB_BAR_BOTTOM_OFFSET +
                TAB_BAR_CONTENT_GAP,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heading}>
            <ThemedText type="title" style={styles.title}>سفارش‌ها</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              وضعیت و گفت‌وگوی هر سفارش را از اینجا دنبال کن.
            </ThemedText>
          </View>
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color="#111111" />
              <ThemedText type="small" themeColor="textSecondary">در حال دریافت سفارش‌ها...</ThemedText>
            </View>
          ) : error ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle" style={styles.emptyTitle}>بارگذاری ناموفق بود</ThemedText>
              <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
              <Pressable onPress={() => void loadOrders()} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>تلاش دوباره</ThemedText>
              </Pressable>
            </ThemedView>
          ) : orders.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <PackageOpen size={34} color="#111111" />
              <ThemedText type="subtitle" style={styles.emptyTitle}>هنوز سفارشی نداری</ThemedText>
              <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
                پس از ثبت سفارش، وضعیت و گفت‌وگو با متصدی را از اینجا دنبال می‌کنی.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.list}>
              {orders.map((order, index) => (
                <Animated.View
                  key={order.id}
                  entering={FadeInDown.delay(index * 45).springify()}>
                  <View style={styles.orderCard}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
                      style={({ pressed }) => [pressed && styles.pressed]}>
                      <ThemedView style={styles.orderContent}>
                        <View style={styles.cardTop}>
                          <ThemedText type="smallBold">{getOrderStatusLabel(order)}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">{order.orderNumber}</ThemedText>
                        </View>
                        <ThemedText type="subtitle" style={styles.serviceTitle}>{order.serviceTitle}</ThemedText>
                        <View style={styles.cardTop}>
                          <ThemedText type="small">
                            {order.orderType === 'free' && order.totalAmount <= 0
                              ? 'مبلغ پس از بررسی مشخص می‌شود'
                              : formatPrice(order.totalAmount)}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatPocketBaseDate(order.created)}
                          </ThemedText>
                        </View>
                      </ThemedView>
                    </Pressable>
                    {canCancelOrder(order) ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={cancellingOrderId !== null}
                        onPress={() => requestOrderCancellation(order)}
                        style={({ pressed }) => [
                          styles.cancelButton,
                          pressed && cancellingOrderId === null && styles.pressed,
                          cancellingOrderId !== null && styles.disabled,
                        ]}>
                        <ThemedText style={styles.cancelButtonText}>
                          {cancellingOrderId === order.id ? 'در حال لغو...' : 'لغو سفارش'}
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  heading: { gap: Spacing.two, alignItems: 'flex-end' },
  title: { fontSize: 34, lineHeight: 42, textAlign: 'right' },
  subtitle: { textAlign: 'right' },
  refreshButton: { alignSelf: 'flex-start', padding: Spacing.two },
  emptyState: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E1E1',
  },
  emptyTitle: { fontSize: 21, lineHeight: 30, textAlign: 'center' },
  centerText: { textAlign: 'center', lineHeight: 25 },
  errorText: { color: '#B42318', textAlign: 'center' },
  primaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  list: { gap: Spacing.three },
  orderCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DEDEDE',
    overflow: 'hidden',
  },
  orderContent: { padding: Spacing.three, gap: Spacing.three },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8C7C4',
    backgroundColor: '#FFF8F7',
  },
  cancelButtonText: { color: '#B42318', fontWeight: '600' },
  disabled: { opacity: 0.55 },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  serviceTitle: { fontSize: 18, lineHeight: 26, textAlign: 'right' },
  pressed: { opacity: 0.7 },
});
