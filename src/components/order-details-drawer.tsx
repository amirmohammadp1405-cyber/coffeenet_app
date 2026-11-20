import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { Check, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { canCancelOrder } from '@/lib/api';
import { formatPocketBaseDate } from '@/lib/date';
import { showErrorToast, showSuccessToast } from '@/lib/notifications';
import type {
  Order,
  OrderAttachment,
  PaymentInstructions,
} from '@/types/platform';

const stages = [
  { status: 'awaiting_payment', title: 'پرداخت هزینه' },
  { status: 'payment_review', title: 'تایید پرداخت' },
  { status: 'in_progress', title: 'انجام سفارش' },
  { status: 'completed', title: 'پایان سفارش' },
] as const;

const statusLabels: Record<Order['status'], string> = {
  awaiting_operator: 'در انتظار پاسخ متصدی',
  awaiting_payment: 'در انتظار پرداخت',
  payment_review: 'در انتظار تایید پرداخت',
  in_progress: 'در حال انجام',
  awaiting_customer: 'نیازمند پاسخ شما',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
};

type OrderDetailsDrawerProps = {
  order: Order;
  attachments: OrderAttachment[];
  payment: PaymentInstructions | null;
  cancelling: boolean;
  onCancel: () => void;
  onClose: () => void;
};

function formatPrice(value: number) {
  return `${new Intl.NumberFormat('fa-IR').format(value)} تومان`;
}

function formatCardNumber(value: string) {
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function formatPayableAmount(value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} تومان`;
}

function getOrderStatusLabel(order: Order) {
  return statusLabels[order.status];
}

async function copyPaymentValue(value: string, label: string) {
  try {
    await Clipboard.setStringAsync(value, { android: { isSensitive: true } });
    showSuccessToast({ title: 'کپی شد', description: `${label} کپی شد` });
  } catch {
    showErrorToast({ title: 'کپی انجام نشد', description: 'لطفاً دوباره تلاش کنید.' });
  }
}

function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'object' && value !== null) {
    if ('address' in value && typeof value.address === 'string') return value.address;
    return JSON.stringify(value);
  }
  return String(value);
}

export function OrderDetailsDrawer({
  order,
  attachments,
  payment,
  cancelling,
  onCancel,
  onClose,
}: OrderDetailsDrawerProps) {
  const displayedStages =
    order.orderType === 'free'
      ? [
          { status: 'awaiting_operator', title: 'گفت‌وگو با متصدی' },
          { status: 'awaiting_customer', title: 'ارسال اطلاعات' },
          { status: 'awaiting_payment', title: 'پرداخت هزینه' },
          { status: 'payment_review', title: 'تایید پرداخت' },
          { status: 'in_progress', title: 'انجام سفارش' },
          { status: 'completed', title: 'پایان سفارش' },
        ]
      : stages;
  const activeStage =
    order.status === 'cancelled'
      ? -1
      : order.orderType === 'free'
        ? displayedStages.findIndex((stage) => stage.status === order.status)
        : order.status === 'awaiting_customer'
          ? 2
          : displayedStages.findIndex((stage) => stage.status === order.status);

  return (
    <View style={styles.container}>
      <View style={styles.drawerHeader}>
        <ThemedText type="subtitle">جزئیات سفارش</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="بستن جزئیات سفارش"
          onPress={onClose}
          style={styles.closeButton}>
          <X size={20} color="#555555" />
        </Pressable>
      </View>
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.orderDetails}>
          <ThemedView style={styles.orderHeader}>
            <ThemedText type="small" themeColor="textSecondary">{order.orderNumber}</ThemedText>
            <ThemedText type="subtitle" style={styles.rightText}>{order.serviceTitle}</ThemedText>
            <View style={styles.statusBadge}>
              <ThemedText type="smallBold" style={styles.statusText}>
                {getOrderStatusLabel(order)}
              </ThemedText>
            </View>
            {order.statusNote ? (
              <ThemedText type="small" style={styles.rightText}>{order.statusNote}</ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
              ثبت‌شده در{' '}
              {formatPocketBaseDate(order.created, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </ThemedText>
          </ThemedView>

          {order.status === 'cancelled' ? (
            <ThemedView style={styles.cancelledCard}>
              <ThemedText type="smallBold">این سفارش لغو شده است.</ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.progressCard}>
              {displayedStages.map((stage, index) => {
                const done = index < activeStage;
                const active = index === activeStage;
                return (
                  <View key={stage.status} style={styles.progressStage}>
                    <View style={[styles.stageDot, (done || active) && styles.activeDot]}>
                      {done ? (
                        <Check size={16} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <ThemedText style={[styles.stageNumber, active && styles.activeNumber]}>
                          {String(index + 1)}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText
                      type="small"
                      themeColor={active || done ? 'text' : 'textSecondary'}
                      style={styles.centerText}>
                      {stage.title}
                    </ThemedText>
                  </View>
                );
              })}
            </ThemedView>
          )}

          <ThemedView style={styles.summaryCard}>
            <ThemedText type="smallBold" style={styles.rightText}>اطلاعات ثبت‌شده</ThemedText>
            <View style={styles.dataRow}>
              <ThemedText type="small" themeColor="textSecondary">مبلغ برآوردی</ThemedText>
              <ThemedText type="smallBold">
                {order.orderType === 'free' && order.totalAmount <= 0
                  ? 'پس از بررسی مشخص می‌شود'
                  : formatPrice(order.totalAmount)}
              </ThemedText>
            </View>
            <View style={styles.dataRow}>
              <ThemedText type="small" themeColor="textSecondary">زمان تقریبی</ThemedText>
              <ThemedText type="small">
                {order.processingMinutes
                  ? `${order.processingMinutes} دقیقه`
                  : order.orderType === 'free'
                    ? 'پس از بررسی مشخص می‌شود'
                    : 'طبق وضعیت خدمت'}
              </ThemedText>
            </View>
            {Object.entries(order.formData).map(([key, value]) => (
              <View key={key} style={styles.dataRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {order.formLabels[key] ?? key}
                </ThemedText>
                <ThemedText type="small" style={styles.valueText}>{formatValue(value)}</ThemedText>
              </View>
            ))}
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachment}>
                <ThemedText type="small" themeColor="textSecondary">
                  {order.formLabels[attachment.fieldKey] ?? attachment.fieldKey}
                </ThemedText>
                {/\.(png|jpe?g|webp)$/i.test(attachment.fileUrl) ? (
                  <Image source={{ uri: attachment.fileUrl }} style={styles.attachmentImage} />
                ) : (
                  <Pressable onPress={() => void Linking.openURL(attachment.fileUrl)}>
                    <ThemedText type="linkPrimary">مشاهدهٔ فایل</ThemedText>
                  </Pressable>
                )}
              </View>
            ))}
          </ThemedView>

          {canCancelOrder(order) ? (
            <View style={styles.cancelSection}>
              <Pressable
                accessibilityRole="button"
                disabled={cancelling}
                onPress={onCancel}
                style={[styles.cancelButton, cancelling && styles.disabled]}>
                {cancelling ? (
                  <ActivityIndicator color="#B42318" />
                ) : (
                  <ThemedText type="smallBold" style={styles.cancelButtonText}>انصراف از سفارش</ThemedText>
                )}
              </Pressable>
            </View>
          ) : null}

          {order.status === 'awaiting_payment' || order.status === 'payment_review' ? (
            <ThemedView style={styles.paymentCard}>
              {payment?.available ? (
                <View style={styles.paymentTable}>
                  {payment.bankName ? (
                    <View style={styles.paymentTableRow}>
                      <ThemedText type="small" themeColor="textSecondary">بانک</ThemedText>
                      <ThemedText style={styles.paymentValue}>{payment.bankName}</ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.paymentTableRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      شماره کارت
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="کپی شماره کارت"
                      onPress={() =>
                        void copyPaymentValue(payment.cardNumber.replace(/\s/g, ''), 'شماره کارت')
                      }>
                      <ThemedText style={styles.paymentValue}>
                        {formatCardNumber(payment.cardNumber)}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View style={styles.paymentTableRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      مبلغ قابل پرداخت
                    </ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="کپی مبلغ قابل پرداخت"
                      onPress={() =>
                        copyPaymentValue(
                          order.totalAmount.toString(),
                          'مبلغ قابل پرداخت',
                        )
                      }>
                      <ThemedText style={styles.paymentValue}>
                        {formatPayableAmount(order.totalAmount)}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View style={[styles.paymentTableRow, styles.lastPaymentTableRow]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      نام حساب
                    </ThemedText>
                    <ThemedText style={styles.paymentValue}>{payment.cardHolder}</ThemedText>
                  </View>
                  {payment.accountNumber ? (
                    <View style={styles.paymentTableRow}>
                      <ThemedText type="small" themeColor="textSecondary">شماره حساب</ThemedText>
                      <ThemedText style={styles.paymentValue}>{payment.accountNumber}</ThemedText>
                    </View>
                  ) : null}
                </View>
              ) : (
                <ThemedText type="small" style={styles.rightText}>
                  اطلاعات پرداخت هنوز توسط متصدی ثبت نشده است.
                </ThemedText>
              )}
              {payment?.available && payment.paymentNote ? (
                <ThemedText type="small" style={styles.rightText}>
                  {payment.paymentNote}
                </ThemedText>
              ) : null}
            </ThemedView>
          ) : null}
        </View>
      </BottomSheetScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexShrink: 1 },
  drawerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  orderDetails: { gap: Spacing.three },
  orderHeader: {
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDDDDD',
  },
  rightText: { textAlign: 'right' },
  centerText: { textAlign: 'center' },
  statusBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 14,
    backgroundColor: '#EBEBEB',
  },
  statusText: { color: '#111111' },
  progressCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  progressStage: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  stageDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBBBBB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  stageNumber: { color: '#666666', fontSize: 12, fontWeight: '700' },
  activeNumber: { color: '#FFFFFF' },
  summaryCard: {
    padding: Spacing.three,
    borderRadius: 20,
    gap: Spacing.two,
    backgroundColor: '#F3F3F3',
  },
  dataRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  attachment: { gap: Spacing.two },
  attachmentImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
  },
  valueText: { textAlign: 'right', flexShrink: 1 },
  cancelledCard: {
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#FCE8E6',
  },
  cancelSection: { gap: Spacing.two },
  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E7B8B4',
    backgroundColor: '#FFF8F7',
  },
  cancelButtonText: { color: '#B42318' },
  disabled: { opacity: 0.55 },
  paymentCard: {
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: '#F3F6FA',
  },
  paymentTable: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D5DCE5',
    borderRadius: 14,
  },
  paymentTableRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D5DCE5',
  },
  lastPaymentTableRow: {
    borderBottomWidth: 0,
  },
  paymentValue: {
    flexShrink: 1,
    color: '#111111',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
    writingDirection: 'ltr',
    fontVariant: ['tabular-nums'],
  },
});