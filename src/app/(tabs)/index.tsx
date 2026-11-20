import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FileText, ImageOff, MessageCircle, Settings } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnnouncementsCarousel } from '@/components/announcements-carousel';
import { AppUpdateCard } from '@/components/app-update-card';
import {
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_CONTENT_GAP,
  TAB_BAR_HEIGHT,
} from '@/components/app-tabs';
import { BottomDrawer, type BottomDrawerHandle } from '@/components/bottom-drawer';
import { ServiceSummaryDrawer } from '@/components/service-summary-drawer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeeklyHoursDrawer } from '@/components/weekly-hours-drawer';
import { Spacing } from '@/constants/theme';
import { useAppUpdate } from '@/hooks/use-app-update';
import {
  fetchAnnouncements,
  fetchCafeStatus,
  createFreeOrder,
  fetchServiceAnnouncements,
  fetchServiceCategories,
} from '@/lib/api';
import type {
  Announcement,
  CafeStatusInfo,
  Service,
  ServiceAnnouncement,
  ServiceCategory,
} from '@/types/platform';

const statusLabels: Record<Exclude<CafeStatusInfo['status'], 'unknown'>, string> = {
  open: 'باز',
  closed: 'بسته',
  busy: 'شلوغ',
};

type ServiceCardProps = {
  service: Service;
  onPress: () => void;
};

function ServiceCard({ service, onPress }: ServiceCardProps) {
  const scale = useSharedValue(1);
  const cardImageUrl = service.cardImageUrl ?? service.imageUrl;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.servicePressable, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={() => {
          scale.set(withTiming(0.97, { duration: 80, easing: Easing.out(Easing.quad) }));
        }}
        onPressOut={() => {
          scale.set(
            withSequence(
              withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
              withTiming(1.035, { duration: 90, easing: Easing.out(Easing.quad) }),
              withDelay(70, withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) })),
            ),
          );
        }}
        style={styles.servicePressable}>
        <ThemedView style={styles.serviceCard}>
          {cardImageUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: cardImageUrl }}
              style={styles.serviceImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageOff size={28} color="#777777" />
            </View>
          )}
          <View style={styles.serviceInfo}>
            <ThemedText type="smallBold" style={styles.serviceTitle}>
              {service.title}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const appUpdate = useAppUpdate();
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [serviceAnnouncements, setServiceAnnouncements] = useState<ServiceAnnouncement[]>([]);
  const [cafeStatus, setCafeStatus] = useState<CafeStatusInfo | null>(null);
  const [servicesError, setServicesError] = useState('');
  const checkForUpdate = appUpdate.checkForUpdate;
  const [announcementsError, setAnnouncementsError] = useState('');
  const [serviceAnnouncementsError, setServiceAnnouncementsError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [freeOrderError, setFreeOrderError] = useState('');
  const [creatingFreeOrder, setCreatingFreeOrder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const drawerRef = useRef<BottomDrawerHandle>(null);
  const pendingOrderServiceId = useRef<string | null>(null);
  const hoursDrawerRef = useRef<BottomDrawerHandle>(null);

  function openService(service: Service) {
    setSelectedService(service);
    drawerRef.current?.present();
  }

  function startOrder(service: Service) {
    pendingOrderServiceId.current = service.id;
    drawerRef.current?.dismiss();
  }

  async function startFreeOrder() {
    if (creatingFreeOrder) return;
    setCreatingFreeOrder(true);
    setFreeOrderError('');
    try {
      const order = await createFreeOrder();
      router.push({ pathname: '/orders/[id]', params: { id: order.id } });
    } catch (createError) {
      setFreeOrderError(
        createError instanceof Error ? createError.message : String(createError),
      );
    } finally {
      setCreatingFreeOrder(false);
    }
  }

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setServicesError('');
    setStatusError('');

    if (showLoading) setIsLoadingAnnouncements(true);
    setAnnouncementsError('');

    const [
      categoriesResult,
      statusResult,
      announcementsResult,
      serviceAnnouncementsResult,
    ] = await Promise.allSettled([
      fetchServiceCategories(),
      fetchCafeStatus(),
      fetchAnnouncements(),
      fetchServiceAnnouncements(),
    ]);

    if (categoriesResult.status === 'fulfilled') {
      setServiceCategories(categoriesResult.value);
    } else {
      setServicesError(
        categoriesResult.reason instanceof Error
          ? categoriesResult.reason.message
          : String(categoriesResult.reason),
      );
    }

    if (statusResult.status === 'fulfilled') {
      setCafeStatus(statusResult.value);
    } else {
      setStatusError(
        statusResult.reason instanceof Error
          ? statusResult.reason.message
          : String(statusResult.reason),
      );
    }

    if (announcementsResult.status === 'fulfilled') {
      setAnnouncements(announcementsResult.value);
    } else {
      setAnnouncementsError(
        announcementsResult.reason instanceof Error
          ? announcementsResult.reason.message
          : String(announcementsResult.reason),
      );
    }

    if (serviceAnnouncementsResult.status === 'fulfilled') {
      setServiceAnnouncements(serviceAnnouncementsResult.value);
      setServiceAnnouncementsError('');
    } else {
      setServiceAnnouncementsError(
        serviceAnnouncementsResult.reason instanceof Error
          ? serviceAnnouncementsResult.reason.message
          : String(serviceAnnouncementsResult.reason),
      );
    }

    setIsLoadingAnnouncements(false);
    setIsLoading(false);
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadData(false), checkForUpdate()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [checkForUpdate, loadData]);

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, [loadData]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          refreshControl={
            <RefreshControl
              colors={['#111111']}
              onRefresh={() => void refreshData()}
              refreshing={isRefreshing}
              tintColor="#111111"
            />
          }
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
            
            <View style={styles.titleRow}>
              <Pressable
                accessibilityLabel="تنظیمات"
                accessibilityRole="button"
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.settingsButton,
                  pressed && styles.pressed,
                ]}>
                <Settings size={19} color="#111111" />
              </Pressable>
              <View style={styles.titleGroup}>
                <ThemedText type="title" style={styles.title}>
                  کافینت امیران
                </ThemedText>
                {cafeStatus && cafeStatus.status !== 'unknown' ? (
                  <Pressable
                    accessibilityLabel={`نمایش ساعت کاری کافینت، وضعیت: ${statusLabels[cafeStatus.status]}`}
                    accessibilityRole="button"
                    onPress={() => hoursDrawerRef.current?.present()}
                    style={[
                      styles.statusCapsule,
                      cafeStatus.status === 'open' && styles.openCapsule,
                      cafeStatus.status === 'busy' && styles.busyCapsule,
                      cafeStatus.status === 'closed' && styles.closedCapsule,
                    ]}>
                    <View
                      style={[
                        styles.statusDot,
                        cafeStatus.status === 'open' && styles.openDot,
                        cafeStatus.status === 'busy' && styles.busyDot,
                        cafeStatus.status === 'closed' && styles.closedDot,
                      ]}
                    />
                    <ThemedText type="smallBold" style={styles.statusLabel}>
                      {statusLabels[cafeStatus.status]}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              
            </View>
            {statusError ? (
              <ThemedText type="small" style={styles.errorText}>
                {statusError}
              </ThemedText>
            ) : null}
          </View>

          {appUpdate.updateAvailable && appUpdate.release ? (
            <AppUpdateCard release={appUpdate.release} />
          ) : null}

          <AnnouncementsCarousel
            announcements={announcements}
            error={announcementsError}
            isLoading={isLoadingAnnouncements}
          />

          <Pressable
            accessibilityRole="button"
            disabled={creatingFreeOrder}
            onPress={() => void startFreeOrder()}
            style={({ pressed }) => [
              styles.freeOrderButton,
              pressed && !creatingFreeOrder && styles.pressed,
              creatingFreeOrder && styles.disabled,
            ]}>
            {creatingFreeOrder ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <MessageCircle size={21} color="#FFFFFF" />
            )}
            <View style={styles.freeOrderText}>
              <ThemedText type="smallBold" style={styles.freeOrderTitle}>
                سفارش آزاد و گفت‌وگو با متصدی
              </ThemedText>
              <ThemedText type="small" style={styles.freeOrderSubtitle}>
                برای درخواست‌های خارج از فهرست خدمات
              </ThemedText>
            </View>
          </Pressable>
          {freeOrderError ? (
            <ThemedText type="small" style={styles.errorText}>{freeOrderError}</ThemedText>
          ) : null}

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#111111" />
              <ThemedText type="small" themeColor="textSecondary">
                در حال دریافت خدمات...
              </ThemedText>
            </View>
          ) : servicesError ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                دریافت خدمات ناموفق بود
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                {servicesError}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadData()}
                style={styles.retryButton}>
                <ThemedText style={styles.retryText}>تلاش دوباره</ThemedText>
              </Pressable>
            </ThemedView>
          ) : serviceCategories.length === 0 ? (
            <ThemedView style={styles.emptyState}>
              <FileText size={36} color="#777777" />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                هنوز خدمتی اضافه نشده
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                خدمات پس از تعریف در پایگاه داده، در اینجا نمایش داده می‌شوند.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.serviceList}>
              {serviceCategories.map((category) => (
                <View key={category.id} style={styles.categorySection}>
                  <View style={styles.categoryHeading}>
                    <ThemedText type="subtitle" style={styles.categoryTitle}>
                      {category.title}
                    </ThemedText>
                  </View>
                  <ScrollView
                    accessibilityLabel={`خدمات دستهٔ ${category.title}؛ برای دیدن بقیه افقی بکشید`}
                    contentContainerStyle={styles.serviceCarouselContent}
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.serviceCarousel}>
                    {category.services.map((service) => (
                      <ServiceCard
                        key={service.id}
                        onPress={() => openService(service)}
                        service={service}
                      />
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomDrawer
        ref={drawerRef}
        onClose={() => {
          setSelectedService(null);
          const serviceId = pendingOrderServiceId.current;
          pendingOrderServiceId.current = null;
          if (serviceId) {
            router.push({ pathname: '/orders/new', params: { serviceId } });
          }
        }}>
        {selectedService ? (
          <ServiceSummaryDrawer
            announcements={serviceAnnouncements.filter(
              (announcement) => announcement.serviceId === selectedService.id,
            )}
            announcementsError={serviceAnnouncementsError}
            onStartOrder={() => startOrder(selectedService)}
            service={selectedService}
          />
        ) : null}
      </BottomDrawer>

      <WeeklyHoursDrawer
        ref={hoursDrawerRef}
        weeklyHours={cafeStatus?.weeklyHours ?? {}}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  heading: {
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'right',
  },
  settingsButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#F0F0F3',
  },
  statusCapsule: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  openCapsule: {
    backgroundColor: '#EAF5ED',
  },
  busyCapsule: {
    backgroundColor: '#FFF4E5',
  },
  closedCapsule: {
    backgroundColor: '#FDECEA',
  },
  statusLabel: {
    fontSize: 13,
  },
  rightText: {
    textAlign: 'right',
  },
  subtitle: {
    textAlign: 'right',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#777777',
  },
  openDot: {
    backgroundColor: '#258443',
  },
  busyDot: {
    backgroundColor: '#B7791F',
  },
  closedDot: {
    backgroundColor: '#B42318',
  },
  servicesHeading: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'right',
  },
  refreshButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  serviceList: {
    gap: Spacing.four,
  },
  freeOrderButton: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 20,
    backgroundColor: '#111111',
  },
  freeOrderText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  freeOrderTitle: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  freeOrderSubtitle: {
    color: '#D5D5D5',
    textAlign: 'right',
  },
  categorySection: {
    gap: Spacing.two,
  },
  categoryHeading: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  categoryTitle: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'right',
  },
  horizontalHint: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.one,
  },
  serviceCarousel: {
    direction: 'rtl',
  },
  serviceCarouselContent: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: Spacing.three,
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.half,
  },
  servicePressable: {
    width: 120,
    borderRadius: 20,
  },
  serviceCard: {
    minHeight: 100,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E1E1',
  },
  serviceImage: {
    width: '100%',
    aspectRatio: 3 / 2,
  },
  imagePlaceholder: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
  },
  serviceInfo: {
    minHeight: 80,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  serviceTitle: {
    width: '100%',
    flexShrink: 1,
    textAlign: 'center',
  },
  priceText: {
    marginTop: Spacing.one,
  },
  loading: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E1E1',
  },
  emptyTitle: {
    fontSize: 21,
    lineHeight: 30,
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#B42318',
    textAlign: 'right',
  },
  retryButton: {
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.6,
  },
});
