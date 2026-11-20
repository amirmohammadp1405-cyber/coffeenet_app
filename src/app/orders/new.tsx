import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ServiceOrderForm } from '@/components/service-order-drawer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchServices } from '@/lib/api';
import type { Service } from '@/types/platform';

export default function NewOrderScreen() {
  const { serviceId: serviceIdParam } = useLocalSearchParams<{ serviceId?: string | string[] }>();
  const serviceId = Array.isArray(serviceIdParam) ? serviceIdParam[0] : serviceIdParam;
  const [service, setService] = useState<Service | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    if (!serviceId) return;

    fetchServices()
      .then((services) => {
        if (!isActive) return;
        const selectedService = services.find((item) => item.id === serviceId);
        if (!selectedService) {
          setError('این خدمت دیگر در دسترس نیست.');
          return;
        }
        setService(selectedService);
      })
      .catch((loadError: unknown) => {
        if (!isActive) return;
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [retryCount, serviceId]);

  const loadError = serviceId ? error : 'خدمت انتخاب‌شده مشخص نیست.';

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {!serviceId ? (
          <View style={styles.state}>
            <ThemedText type="subtitle" style={styles.centerText}>
              دریافت اطلاعات خدمت ناموفق بود
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {loadError}
            </ThemedText>
          </View>
        ) : isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color="#111111" />
            <ThemedText type="small" themeColor="textSecondary">
              در حال آماده‌سازی فرم سفارش...
            </ThemedText>
          </View>
        ) : loadError ? (
          <View style={styles.state}>
            <ThemedText type="subtitle" style={styles.centerText}>
              دریافت اطلاعات خدمت ناموفق بود
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {loadError}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsLoading(true);
                setError('');
                setRetryCount((count) => count + 1);
              }}
              style={styles.retryButton}>
              <ThemedText type="smallBold" style={styles.retryText}>تلاش دوباره</ThemedText>
            </Pressable>
          </View>
        ) : service ? (
          <ServiceOrderForm service={service} />
        ) : null}
      </SafeAreaView>
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
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  retryText: {
    color: '#FFFFFF',
  },
});
