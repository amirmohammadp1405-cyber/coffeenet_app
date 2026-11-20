import * as SelectPrimitive from '@rn-primitives/select';
import { Check, ChevronDown } from 'lucide-react-native';
import { Fragment, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ColorValue,
} from 'react-native';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SelectOption = {
  label: string;
  value: number;
};

type SelectProps = {
  accessibilityLabel: string;
  backgroundColor: ColorValue;
  borderColor: ColorValue;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  onValueChange: (value: number) => void;
  options: SelectOption[];
  textColor: ColorValue;
  value: number;
};

function NativeSelectScrollView({ children }: { children: ReactNode }) {
  if (Platform.OS === 'web') {
    return (
      <SelectPrimitive.Viewport
        style={{ maxHeight: 208, overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
        {children}
      </SelectPrimitive.Viewport>
    );
  }

  return (
    <SelectPrimitive.Viewport>
      <GestureHandlerScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={styles.optionsList}>
        {children}
      </GestureHandlerScrollView>
    </SelectPrimitive.Viewport>
  );
}

export function Select({
  accessibilityLabel,
  backgroundColor,
  borderColor,
  disabled = false,
  onOpenChange,
  onValueChange,
  options,
  textColor,
  value,
}: SelectProps) {
  const insets = useSafeAreaInsets();
  const selected = options.find((option) => option.value === value);
  const WindowOverlay = Platform.OS === 'ios' ? FullWindowOverlay : Fragment;

  return (
    <SelectPrimitive.Root
      disabled={disabled}
      onOpenChange={onOpenChange}
      onValueChange={(option) => {
        if (option) {
          const nextValue = Number(option.value);
          if (Number.isFinite(nextValue)) onValueChange(nextValue);
        }
      }}
      value={selected ? { label: selected.label, value: String(selected.value) } : undefined}>
      <SelectPrimitive.Trigger
        accessibilityLabel={accessibilityLabel}
        style={[styles.trigger, { backgroundColor, borderColor }]}>
        <SelectPrimitive.Value
          placeholder=""
          style={[styles.triggerText, { color: textColor }]}
        />
        <ChevronDown
          color={textColor}
          size={16}
          style={styles.triggerIcon}
        />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <WindowOverlay>
          <SelectPrimitive.Overlay
            asChild={Platform.OS !== 'web'}
            style={Platform.select({ native: StyleSheet.absoluteFill })}>
            <Pressable style={StyleSheet.absoluteFill}>
              <SelectPrimitive.Content
                insets={insets}
                side="bottom"
                sideOffset={4}
                style={{ ...styles.content, borderColor }}>
                <NativeSelectScrollView>
                  {options.map((option) => (
                    <SelectPrimitive.Item
                      key={option.value}
                      label={option.label}
                      value={String(option.value)}
                      style={styles.option}>
                      <SelectPrimitive.ItemText
                        style={[styles.optionText, { color: textColor }]}
                      />
                      <View pointerEvents="none" style={styles.itemIndicator}>
                        <SelectPrimitive.ItemIndicator>
                          <Check color={textColor} size={16} />
                        </SelectPrimitive.ItemIndicator>
                      </View>
                    </SelectPrimitive.Item>
                  ))}
                </NativeSelectScrollView>
              </SelectPrimitive.Content>
            </Pressable>
          </SelectPrimitive.Overlay>
        </WindowOverlay>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 52,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  triggerText: {
    textAlign: 'center',
    fontFamily: 'Noto Sans Arabic',
    fontSize: 14,
  },
  triggerIcon: {
    position: 'absolute',
    right: 8,
  },
  content: {
    maxHeight: 208,
    minWidth: 120,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    elevation: 9999,
  },
  optionsList: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
  },
  option: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    fontFamily: 'Noto Sans Arabic',
    fontSize: 14,
    textAlign: 'center',
  },
  itemIndicator: {
    position: 'absolute',
    right: 8,
  },
});
