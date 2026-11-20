import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, useColorScheme } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { PortalHost } from '@rn-primitives/portal';
import { Toaster } from 'sileo-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Noto Sans Arabic': require('../../assets/fonts/NotoSansArabic-Variable.ttf'),
  });
  const colorScheme = useColorScheme();

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="orders/new" />
            <Stack.Screen name="orders/[id]" />
          </Stack>
          <Toaster
            container={Platform.OS === 'ios' ? FullWindowOverlay : undefined}
            position="top-center"
            theme={{
              light: { fontFamily: 'Noto Sans Arabic' },
              dark: { fontFamily: 'Noto Sans Arabic' },
            }}
          />
          <PortalHost />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
