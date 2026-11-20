import { usePathname } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { House, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Screen } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';

type TabName = 'index' | 'explore' | 'orders';
type TabLayout = { x: number; width: number };
type TabSlotRenderFn = NonNullable<ComponentProps<typeof TabSlot>['renderFn']>;
type TabDescriptor = Parameters<TabSlotRenderFn>[0];
type TabRenderOptions = Parameters<TabSlotRenderFn>[1];

export const TAB_BAR_HEIGHT = 66;
export const TAB_BAR_BOTTOM_OFFSET = 16;
export const TAB_BAR_CONTENT_GAP = 16;

function AnimatedTabScreen({
  descriptor,
  isFocused,
  detachInactiveScreens,
}: {
  descriptor: TabDescriptor;
  isFocused: boolean;
  detachInactiveScreens: TabRenderOptions['detachInactiveScreens'];
}) {
  const [screenActive, setScreenActive] = useState(isFocused);
  const [progress] = useState(() => new Animated.Value(isFocused ? 1 : 0));

  useEffect(() => {
    const focusFrame = isFocused
      ? requestAnimationFrame(() => setScreenActive(true))
      : null;

    const animation = Animated.timing(progress, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !isFocused) setScreenActive(false);
    });

    return () => {
      if (focusFrame !== null) cancelAnimationFrame(focusFrame);
      animation.stop();
    };
  }, [isFocused, progress]);

  const animatedStyle = {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <Screen
      enabled={detachInactiveScreens}
      activityState={screenActive ? 2 : 0}
      freezeOnBlur={false}
      style={[styles.tabScreen, { zIndex: isFocused ? 1 : 0 }]}>
      <Animated.View
        accessibilityElementsHidden={!isFocused}
        importantForAccessibility={isFocused ? 'auto' : 'no-hide-descendants'}
        pointerEvents={isFocused ? 'auto' : 'none'}
        style={[styles.tabScreenContent, animatedStyle]}>
        {descriptor.render()}
      </Animated.View>
    </Screen>
  );
}

const renderTabScreen: TabSlotRenderFn = (
  descriptor,
  { isFocused, loaded, detachInactiveScreens },
) => {
  if (descriptor.options.unmountOnBlur && !isFocused) return null;
  if (descriptor.options.lazy && !loaded && !isFocused) return null;

  return (
    <AnimatedTabScreen
      key={descriptor.route.key}
      descriptor={descriptor}
      isFocused={isFocused}
      detachInactiveScreens={detachInactiveScreens}
    />
  );
};

type TabContentProps = {
  focused: boolean;
  label: string;
  icon: LucideIcon;
};

function TabContent({ focused, label, icon: Icon }: TabContentProps) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      damping: 17,
      stiffness: 190,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [focused, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Animated.View style={[styles.tabButton, { transform: [{ scale }] }]}>
      <Icon
        size={19}
        color={focused ? '#000' : '#fff'}
      />
      <Animated.Text style={[styles.tabLabel, focused && styles.selectedLabel]}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const currentTab: TabName =
    pathname === '/' ? 'index' : pathname === '/explore' ? 'explore' : 'orders';
  const [tabLayouts, setTabLayouts] = useState<Partial<Record<TabName, TabLayout>>>({});
  const [indicatorX] = useState(() => new Animated.Value(0));
  const [indicatorWidth] = useState(() => new Animated.Value(0));
  const indicatorReady = useRef(false);

  useEffect(() => {
    const layout = tabLayouts[currentTab];
    if (!layout) return;

    if (!indicatorReady.current) {
      indicatorX.setValue(layout.x);
      indicatorWidth.setValue(layout.width);
      indicatorReady.current = true;
      return;
    }

    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: layout.x,
        damping: 20,
        stiffness: 180,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorWidth, {
        toValue: layout.width,
        damping: 20,
        stiffness: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [currentTab, indicatorWidth, indicatorX, tabLayouts]);

  const onTabLayout = (name: TabName) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((layouts) => ({
      ...layouts,
      [name]: { x, width: width - 10 },
    }));
  };

  return (
    <Tabs>
      <TabSlot style={styles.tabSlot} renderFn={renderTabScreen} />
      <TabList asChild>
        <View
          style={StyleSheet.flatten([
            styles.tabBarPosition,
            styles.tabBar,
            { bottom: insets.bottom + TAB_BAR_BOTTOM_OFFSET },
          ])}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.selectionIndicator,
              { width: indicatorWidth, transform: [{ translateX: indicatorX }] },
            ]}
          />
          <TabTrigger
            name="index"
            href="/"
            accessibilityRole="tab"
            onLayout={onTabLayout('index')}
            style={styles.tabPressable}>
            <TabContent
              focused={currentTab === 'index'}
              label="خانه"
              icon={House}
            />
          </TabTrigger>
          <TabTrigger
            name="explore"
            href="/explore"
            accessibilityRole="tab"
            onLayout={onTabLayout('explore')}
            style={styles.tabPressable}>
            <TabContent
              focused={currentTab === 'explore'}
              label="متصدی هوشمند"
              icon={Sparkles}
            />
          </TabTrigger>
          <TabTrigger
            name="orders"
            href="/orders"
            accessibilityRole="tab"
            onLayout={onTabLayout('orders')}
            style={styles.tabPressable}>
            <TabContent
              focused={currentTab === 'orders'}
              label="سفارش‌ها"
              icon={MessageCircle}
            />
          </TabTrigger>
        </View>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabSlot: {
    flex: 1,
  },
  tabScreen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  tabScreenContent: {
    flex: 1,
  },
  tabBarPosition: {
    position: 'absolute',
    alignSelf: 'center',
  },
  tabBar: {
    minHeight: TAB_BAR_HEIGHT,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 34,
    backgroundColor: '#181818',
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 5,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  tabPressable: {
    minHeight: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    minWidth: 100,
    minHeight: 56,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    color: '#fff',
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '600',
  },
  selectedLabel: {
    color: '#000000',
  },
});
