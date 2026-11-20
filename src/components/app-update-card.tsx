import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { openWebLink } from '@/lib/api';
import type { AppVersion } from '@/types/platform';

type AppUpdateCardProps = {
  release: AppVersion;
};

export function AppUpdateCard({ release }: AppUpdateCardProps) {
  const theme = useTheme();
  const [linkError, setLinkError] = useState('');

  async function openUpdateLink() {
    setLinkError('');
    try {
      await openWebLink(release.link);
    } catch (error: unknown) {
      setLinkError(error instanceof Error ? error.message : 'باز کردن لینک ناموفق بود.');
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold" style={styles.title}>
        نسخهٔ {release.version} آمادهٔ دریافت است
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {release.description}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        این به‌روزرسانی اختیاری است و می‌توانید هر زمان خواستید آن را انجام دهید.
      </ThemedText>
      <Pressable
        accessibilityRole="link"
        onPress={() => void openUpdateLink()}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.buttonText}>
          مشاهده و دریافت به‌روزرسانی
        </ThemedText>
      </Pressable>
      {linkError ? (
        <ThemedText type="small" style={styles.errorText}>
          {linkError}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9A441',
  },
  title: {
    textAlign: 'right',
  },
  description: {
    textAlign: 'right',
    lineHeight: 23,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: '#111111',
  },
  buttonText: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#B42318',
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.72,
  },
});
