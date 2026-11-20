import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { openWebLink } from '@/lib/api';
import type { Announcement } from '@/types/platform';

type AnnouncementsCarouselProps = {
  announcements: Announcement[];
  error: string;
  isLoading: boolean;
};

const textureDots = Array.from({ length: 24 }, (_, index) => ({
  left: `${8 + (index % 6) * 16}%` as const,
  top: `${15 + Math.floor(index / 6) * 24}%` as const,
}));

export function AnnouncementsCarousel({
  announcements,
  error,
  isLoading,
}: AnnouncementsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (announcements.length < 2) return;

    const interval = setInterval(() => {
      setActiveIndex((index) => (index + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  const announcement =
    announcements.length > 0 ? announcements[activeIndex % announcements.length] : null;

  return (
    <View style={styles.section}>
      {announcement ? (
        <View
          accessibilityLabel={`${announcement.title}. ${announcement.description}`}
          accessible
          style={[
            styles.card,
            { backgroundColor: announcement.backgroundColor || '#4A2C22' },
          ]}>
          {announcement.backgroundType === 'image' && announcement.imageUrl ? (
            <>
              <Image
                contentFit="cover"
                source={{ uri: announcement.imageUrl }}
                style={StyleSheet.absoluteFill}
                transition={200}
              />
              <View pointerEvents="none" style={styles.imageShade} />
            </>
          ) : announcement.backgroundTexture === 'dots' ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {textureDots.map((dot, index) => (
                <View key={index} style={[styles.textureDot, dot]} />
              ))}
            </View>
          ) : announcement.backgroundTexture === 'stripes' ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {Array.from({ length: 10 }, (_, index) => (
                <View
                  key={index}
                  style={[styles.textureStripe, { left: `${index * 14 - 20}%` }]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.cardContent}>
            <ThemedText type="subtitle" style={styles.title}>
              {announcement.title}
            </ThemedText>
            <ThemedText style={styles.description}>{announcement.description}</ThemedText>
            {announcement.link ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  if (!announcement.link) return;
                  setLinkError('');
                  void openWebLink(announcement.link).catch((error: unknown) => {
                    setLinkError(
                      error instanceof Error ? error.message : 'باز کردن لینک ناموفق بود.',
                    );
                  });
                }}
                style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
                <ThemedText style={styles.linkText}>مشاهدهٔ بیشتر</ThemedText>
              </Pressable>
            ) : null}
            {linkError ? <ThemedText style={styles.linkError}>{linkError}</ThemedText> : null}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          {isLoading ? (
            <ActivityIndicator color="#777777" />
          ) : (
            <ThemedText
              style={[styles.emptyText, error ? styles.errorText : undefined]}>
              {error || 'اطلاعیه‌ای برای نمایش وجود ندارد.'}
            </ThemedText>
          )}
        </View>
      )}

      {announcements.length > 1 ? (
        <View accessibilityLabel="انتخاب اطلاعیه" style={styles.pagination}>
          {announcements.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityLabel={`اطلاعیهٔ ${index + 1}`}
              accessibilityRole="button"
              accessibilityState={{ selected: index === activeIndex % announcements.length }}
              hitSlop={8}
              onPress={() => setActiveIndex(index)}
              style={[
                styles.paginationDot,
                index === activeIndex % announcements.length && styles.activePaginationDot,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'right',
  },
  card: {
    minHeight: 176,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 20,
  },
  imageShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  cardContent: {
    alignItems: 'flex-end',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'right',
  },
  description: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'right',
  },
  linkButton: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  linkText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  linkError: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.72,
  },
  textureDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.18,
  },
  textureStripe: {
    position: 'absolute',
    top: -50,
    width: 8,
    height: 280,
    backgroundColor: '#FFFFFF',
    opacity: 0.1,
    transform: [{ rotate: '30deg' }],
  },
  emptyCard: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E1E1',
    borderRadius: 22,
  },
  emptyText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#B42318',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C8C8C8',
  },
  activePaginationDot: {
    width: 20,
    backgroundColor: '#111111',
  },
});
