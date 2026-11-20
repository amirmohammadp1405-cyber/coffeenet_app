import { X } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { normalizeDigits, validateTextField } from '@/lib/form-validation';
import type {
  ServiceFormInputType,
  ServiceFormValidationMessages,
} from '@/types/platform';

type FormTextInputProps = {
  label?: string;
  description?: string;
  type: ServiceFormInputType;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  validationMessages?: ServiceFormValidationMessages;
  showValidationError?: boolean;
  error?: string;
  clearable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  nativeProps?: Omit<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'style'
  >;
};

export const FormTextInput = forwardRef<TextInputInstance, FormTextInputProps>(
  function FormTextInput(
    {
      label,
      description,
      type,
      value,
      onChangeText,
      placeholder,
      required = false,
      minLength,
      maxLength,
      min,
      max,
      validationMessages,
      showValidationError = false,
      error,
      clearable = true,
      containerStyle,
      inputContainerStyle,
      inputStyle,
      nativeProps,
    },
    ref,
  ) {
    const theme = useTheme();
    const [touched, setTouched] = useState(false);
    const validationError = validateTextField(
      { type, label: label ?? '', required, minLength, maxLength, min, max, validationMessages },
      value,
    );
    const visibleError = error || ((touched || showValidationError) && validationError) || '';
    const isMultiline = type === 'textarea' || nativeProps?.multiline === true;
    const isNumericType = type === 'number' || type === 'nationalId' || type === 'postalCode';
    const defaultMaxLength =
      type === 'nationalId' || type === 'postalCode' ? 10 : maxLength;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <ThemedText type="smallBold" style={styles.label}>
            {label}
            {required ? ' *' : ''}
          </ThemedText>
        ) : null}
        {description ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {description}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.inputContainer,
            isMultiline && styles.multilineContainer,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: visibleError ? '#B42318' : theme.backgroundSelected,
            },
            inputContainerStyle,
          ]}>
          <TextInput
            {...nativeProps}
            ref={ref}
            accessibilityLabel={nativeProps?.accessibilityLabel ?? label}
            autoCapitalize={
              nativeProps?.autoCapitalize ??
              (type === 'email' || isNumericType ? 'none' : 'sentences')
            }
            autoComplete={
              nativeProps?.autoComplete ??
              (type === 'email'
                ? 'email'
                : type === 'phone'
                  ? 'tel'
                  : type === 'nationalId'
                    ? 'off'
                    : type === 'postalCode'
                      ? 'postal-code'
                      : 'off')
            }
            keyboardType={
              nativeProps?.keyboardType ??
              (type === 'number'
                ? 'numeric'
                : type === 'nationalId' || type === 'postalCode'
                ? 'number-pad'
                : type === 'email'
                  ? 'email-address'
                  : type === 'phone'
                    ? 'phone-pad'
                    : 'default')
            }
            maxLength={defaultMaxLength}
            multiline={isMultiline}
            onBlur={(event) => {
              setTouched(true);
              nativeProps?.onBlur?.(event);
            }}
            onChangeText={(text) => onChangeText(isNumericType || type === 'phone' ? normalizeDigits(text) : text)}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            selectionColor={theme.text}
            style={[
              styles.input,
              isMultiline && styles.multilineInput,
              { color: theme.text },
              inputStyle,
            ]}
            textAlign={nativeProps?.textAlign ?? 'right'}
            textAlignVertical={nativeProps?.textAlignVertical ?? (isMultiline ? 'top' : 'center')}
            value={value}
          />
          {clearable && value.length > 0 ? (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.clearButton}>
              <Pressable
                accessibilityLabel={label ? `پاک کردن ${label}` : 'پاک کردن متن'}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => onChangeText('')}
                style={({ pressed }) => [styles.clearPressable, pressed && styles.clearPressed]}>
                <X color={theme.textSecondary} size={18} />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
        {visibleError ? (
          <ThemedText
            accessibilityLiveRegion="polite"
            type="small"
            style={styles.error}>
            {visibleError}
          </ThemedText>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    gap: 5,
  },
  label: {
    textAlign: 'right',
  },
  description: {
    textAlign: 'right',
  },
  inputContainer: {
    minHeight: 52,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  multilineContainer: {
    minHeight: 112,
    justifyContent: 'flex-start',
  },
  input: {
    minHeight: 50,
    paddingLeft: 48,
    paddingRight: 14,
    paddingVertical: 10,
    fontFamily: Fonts.sans,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
  },
  clearButton: {
    position: 'absolute',
    left: 6,
    top: 6,
  },
  clearPressable: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  clearPressed: {
    backgroundColor: '#00000012',
  },
  error: {
    color: '#B42318',
    textAlign: 'right',
  },
});
