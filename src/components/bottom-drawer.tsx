import {
  BottomSheetBackdrop,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

type BottomDrawerProps = {
  bottomOffset?: number;
  onClose?: () => void;
  children: React.ReactNode;
};

export type BottomDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

export const BottomDrawer = forwardRef<BottomDrawerHandle, BottomDrawerProps>(
  function BottomDrawer({ bottomOffset = 0, onClose, children }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [isPresented, setIsPresented] = useState(false);
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { height } = useWindowDimensions();
    const bottomInset = insets.bottom + bottomOffset;
    const present = useCallback(() => {
      sheetRef.current?.present();
      setIsPresented(true);
    }, []);
    const dismiss = useCallback(() => sheetRef.current?.dismiss(), []);
    useImperativeHandle(ref, () => ({ present, dismiss }), [dismiss, present]);
    useEffect(() => {
      if (Platform.OS !== 'android' || !isPresented) return;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          dismiss();
          return true;
        },
      );
      return () => subscription.remove();
    }, [dismiss, isPresented]);
    const handleChange = useCallback((index: number) => {
      setIsPresented(index >= 0);
    }, []);
    const handleDismiss = useCallback(() => {
      setIsPresented(false);
      onClose?.();
    }, [onClose]);
    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        maxDynamicContentSize={Math.max(0, height - insets.top - bottomInset)}
        enablePanDownToClose
        onChange={handleChange}
        onDismiss={handleDismiss}
        topInset={insets.top}
        bottomInset={bottomInset}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.background }}
        handleIndicatorStyle={styles.handle}
        style={styles.sheet}>
        {children}
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  sheet: {
    zIndex: 100,
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: '#8E8E93',
  },
});
