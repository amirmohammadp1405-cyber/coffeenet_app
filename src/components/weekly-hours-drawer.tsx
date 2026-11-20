import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Clock3, X } from 'lucide-react-native';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomDrawer, type BottomDrawerHandle } from '@/components/bottom-drawer';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { WeeklyHours, WeekdayKey } from '@/types/platform';

const weekdays: { key: WeekdayKey; label: string }[] = [
  { key: 'saturday', label: 'شنبه' },
  { key: 'sunday', label: 'یکشنبه' },
  { key: 'monday', label: 'دوشنبه' },
  { key: 'tuesday', label: 'سه‌شنبه' },
  { key: 'wednesday', label: 'چهارشنبه' },
  { key: 'thursday', label: 'پنجشنبه' },
  { key: 'friday', label: 'جمعه' },
];

type WeeklyHoursDrawerProps = {
  weeklyHours: WeeklyHours;
};

export const WeeklyHoursDrawer = forwardRef<BottomDrawerHandle, WeeklyHoursDrawerProps>(
  function WeeklyHoursDrawer({ weeklyHours }, ref) {
    const theme = useTheme();
    const drawerRef = useRef<BottomDrawerHandle>(null);
    const present = useCallback(() => drawerRef.current?.present(), []);
    const dismiss = useCallback(() => drawerRef.current?.dismiss(), []);

    useImperativeHandle(ref, () => ({ present, dismiss }), [dismiss, present]);

    return (
      <BottomDrawer ref={drawerRef}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.heading}>
              ساعت کاری
            </ThemedText>
            <Pressable
              accessibilityLabel="بستن ساعت کاری"
              accessibilityRole="button"
              hitSlop={10}
              onPress={dismiss}
              style={styles.closeButton}>
              <X color={theme.textSecondary} size={22} />
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            ساعت فعالیت کافینت در روزهای هفته
          </ThemedText>

          <BottomSheetScrollView
            contentContainerStyle={styles.days}
            showsVerticalScrollIndicator={false}>
            {weekdays.map(({ key, label }) => {
              const hours = weeklyHours[key];
              const shifts =
                hours?.shifts ??
                (hours?.open && hours.close
                  ? [{ open: hours.open, close: hours.close }]
                  : []);

              return (
                <View
                  key={key}
                  style={[styles.dayRow, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold" style={styles.dayName}>
                    {label}
                  </ThemedText>
                  <View style={styles.hoursValue}>
                    {!hours?.closed && shifts.length > 0 ? (
                      <Clock3 color={theme.textSecondary} size={16} />
                    ) : null}
                    {hours?.closed ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        تعطیل
                      </ThemedText>
                    ) : shifts.length > 0 ? (
                      <View style={styles.timeRanges}>
                        {shifts.map(({ open, close }, index) => (
                          <ThemedText key={`${open}-${close}-${index}`} type="small">
                            {open} تا {close}
                          </ThemedText>
                        ))}
                      </View>
                    ) : (
                      <ThemedText type="small">ثبت نشده</ThemedText>
                    )}
                  </View>
                </View>
              );
            })}
          </BottomSheetScrollView>
        </View>
      </BottomDrawer>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    textAlign: 'right',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  description: {
    marginTop: 2,
    marginBottom: 14,
    textAlign: 'right',
  },
  days: {
    gap: 8,
    paddingBottom: 12,
  },
  dayRow: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayName: {
    textAlign: 'right',
  },
  hoursValue: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  timeRanges: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
