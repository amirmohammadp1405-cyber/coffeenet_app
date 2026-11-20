import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Service, ServiceAnnouncement } from '@/types/platform';

type ServiceSummaryDrawerProps = {
  service: Service;
  announcements: ServiceAnnouncement[];
  announcementsError: string;
  onStartOrder: () => void;
};

const announcementColors: Record<
  ServiceAnnouncement['type'],
  { backgroundColor: string; textColor: string; label: string }
> = {
  info: { backgroundColor: '#E8F1FF', textColor: '#174EA6', label: 'اطلاع‌رسانی' },
  success: { backgroundColor: '#E8F5EC', textColor: '#176B36', label: 'موفقیت' },
  warning: { backgroundColor: '#FFF4D6', textColor: '#805B00', label: 'هشدار' },
  urgent: { backgroundColor: '#FDEAEA', textColor: '#A12622', label: 'مهم' },
};

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat('fa-IR').format(amount)} تومان`;
}

function getServiceTotal(service: Service) {
  return service.basePrice + service.priceBreakdown.reduce((sum, item) => sum + item.amount, 0);
}

export function ServiceSummaryDrawer({
  service,
  announcements,
  announcementsError,
  onStartOrder,
}: ServiceSummaryDrawerProps) {
  const detailImageUrl = service.detailImageUrl ?? service.imageUrl;
  const availabilityText =
    service.availability.note ||
    [
      service.availability.days?.join('، '),
      service.availability.start && service.availability.end
        ? `${service.availability.start} تا ${service.availability.end}`
        : '',
    ]
      .filter(Boolean)
      .join('، ') ||
    'طبق ظرفیت متصدی';

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {detailImageUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: detailImageUrl }}
          style={styles.heroImage}
        />
      ) : null}
      <ThemedText type="subtitle" style={styles.rightText}>
        {service.title}
      </ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={styles.rightText}>
        {service.summary}
      </ThemedText>
      {announcementsError ? (
        <View style={styles.announcementError}>
          <ThemedText type="small" style={styles.announcementErrorText}>
            دریافت اطلاعیه‌های این خدمت ناموفق بود: {announcementsError}
          </ThemedText>
        </View>
      ) : null}
      {announcements.map((announcement) => {
        const colors = announcementColors[announcement.type];
        return (
          <View
            key={announcement.id}
            accessibilityLabel={`${colors.label}. ${announcement.title ? `${announcement.title}. ` : ''}${announcement.message}`}
            accessible
            style={[styles.announcementCard, { backgroundColor: colors.backgroundColor }]}>
            {announcement.title ? (
              <ThemedText
                type="smallBold"
                style={[styles.rightText, { color: colors.textColor }]}>
                {announcement.title}
              </ThemedText>
            ) : null}
            <ThemedText
              type="small"
              style={[styles.rightText, { color: colors.textColor }]}>
              {announcement.message}
            </ThemedText>
          </View>
        );
      })}
      <View style={styles.infoRow}>
        <ThemedText type="small" themeColor="textSecondary">زمان تقریبی</ThemedText>
        <ThemedText type="smallBold">
          {service.processingMinutes ? `${service.processingMinutes} دقیقه` : 'پس از بررسی اعلام می‌شود'}
        </ThemedText>
      </View>
      <View style={styles.infoRow}>
        <ThemedText type="small" themeColor="textSecondary">زمان ارائهٔ خدمت</ThemedText>
        <ThemedText type="small" style={styles.rightText}>{availabilityText}</ThemedText>
      </View>
      <ThemedView style={styles.priceCard}>
        <ThemedText type="smallBold" style={styles.rightText}>جزئیات هزینهٔ برآوردی</ThemedText>
        <View style={styles.infoRow}>
          <ThemedText type="small">هزینهٔ پایه</ThemedText>
          <ThemedText type="small">{formatPrice(service.basePrice)}</ThemedText>
        </View>
        {service.priceBreakdown.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.infoRow}>
            <ThemedText type="small">{item.label}</ThemedText>
            <ThemedText type="small">{formatPrice(item.amount)}</ThemedText>
          </View>
        ))}
        <View style={[styles.infoRow, styles.totalRow]}>
          <ThemedText type="smallBold">جمع برآوردی</ThemedText>
          <ThemedText type="smallBold">{formatPrice(getServiceTotal(service))}</ThemedText>
        </View>
      </ThemedView>
      {service.formSchema.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
          برای ثبت سفارش چند مورد اطلاعات از شما دریافت می‌شود.
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onStartOrder}
        style={styles.submitButton}>
        <ThemedText type="smallBold" style={styles.submitText}>ثبت سفارش</ThemedText>
      </Pressable>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 18,
  },
  rightText: {
    textAlign: 'right',
  },
  announcementCard: {
    padding: Spacing.three,
    gap: Spacing.one,
    borderRadius: 16,
  },
  announcementError: {
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#FDEAEA',
  },
  announcementErrorText: {
    color: '#A12622',
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  priceCard: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: 18,
    backgroundColor: '#F1F1F1',
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#BDBDBD',
    paddingTop: Spacing.two,
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#111111',
  },
  submitText: {
    color: '#FFFFFF',
  },
});
