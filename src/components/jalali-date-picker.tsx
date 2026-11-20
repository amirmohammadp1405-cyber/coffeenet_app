import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Select, type SelectOption } from '@/components/ui/select';
import { FormTextInput } from '@/components/ui/form-text-input';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import {
  getDaysInJalaliMonth,
  getJalaliDate,
  getTodayJalaliDate,
  jalaliDateToGregorian,
  jalaliMonthNames,
  toPersianDigits,
  type JalaliDateParts,
} from '@/lib/jalali-date';

type JalaliDatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
  onDropdownOpenChange?: (open: boolean) => void;
};

type YearInputProps = {
  value: number;
  min: number;
  max: number;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
  onValueChange: (value: number) => void;
};

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function YearInput({
  value,
  min,
  max,
  textColor,
  borderColor,
  backgroundColor,
  onValueChange,
}: YearInputProps) {
  const initialText = toPersianDigits(value);
  const [text, setText] = useState(initialText);
  const textRef = useRef(initialText);

  function handleChangeText(nextText: string) {
    const digits = toEnglishDigits(nextText).replace(/\D/g, '').slice(0, 4);
    const formattedText = toPersianDigits(digits);
    textRef.current = formattedText;
    setText(formattedText);
    if (digits.length !== 4) return;

    const year = Number(digits);
    if (year >= min && year <= max) onValueChange(year);
  }

  function handleBlur() {
    const digits = toEnglishDigits(textRef.current).replace(/\D/g, '');
    const year = Number(digits);
    if (digits.length === 4 && year >= min && year <= max) {
      onValueChange(year);
    } else {
      const currentValue = toPersianDigits(value);
      textRef.current = currentValue;
      setText(currentValue);
    }
  }

  return (
    <View style={styles.pickerColumn}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabel}>
        سال
      </ThemedText>
      <FormTextInput
          type="number"
          value={text}
          onChangeText={handleChangeText}
          maxLength={4}
          clearable={false}
          containerStyle={styles.yearField}
          inputContainerStyle={[styles.control, { borderColor, backgroundColor }]}
          inputStyle={[styles.yearInput, { color: textColor }]}
          nativeProps={{
            accessibilityLabel: 'سال',
            keyboardType: 'number-pad',
            onBlur: handleBlur,
            selectTextOnFocus: true,
            textAlign: 'center',
          }}
        />
    </View>
  );
}

export function JalaliDatePicker({
  value,
  onChange,
  accessibilityLabel = 'انتخاب تاریخ',
  onDropdownOpenChange,
}: JalaliDatePickerProps) {
  const theme = useTheme();
  const today = getTodayJalaliDate();
  const selected = (value && getJalaliDate(value)) || today;
  const minYear = today.year - 150;
  const maxYear = today.year + 100;
  const year = Math.max(minYear, Math.min(maxYear, selected.year));
  const selectedDate = {
    ...selected,
    year,
    day: Math.min(selected.day, getDaysInJalaliMonth(year, selected.month)),
  };
  const dayCount = getDaysInJalaliMonth(selectedDate.year, selectedDate.month);
  const dayOptions = Array.from({ length: dayCount }, (_, index) => index + 1);
  const [openDropdown, setOpenDropdown] = useState<'day' | 'month' | null>(null);

  function closeDropdown() {
    setOpenDropdown(null);
    onDropdownOpenChange?.(false);
  }

  function makeOptions(
    values: number[],
    formatOption: (value: number) => string,
  ): SelectOption[] {
    return values.map((option) => ({
      label: formatOption(option),
      value: option,
    }));
  }

  function updateDate(part: keyof JalaliDateParts, nextValue: number) {
    const next = { ...selectedDate, [part]: nextValue };
    next.day = Math.min(next.day, getDaysInJalaliMonth(next.year, next.month));
    const gregorianDate = jalaliDateToGregorian(next.year, next.month, next.day);
    if (gregorianDate) onChange(gregorianDate);
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.pickers, openDropdown !== null && styles.openPicker]}>
      <View style={styles.pickerColumn}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabel}>
          روز
        </ThemedText>
        <Select
          accessibilityLabel="روز"
          backgroundColor={theme.background}
          borderColor={theme.backgroundSelected}
          disabled={openDropdown !== null && openDropdown !== 'day'}
          onOpenChange={(open) => {
            if (open) setOpenDropdown('day');
            else closeDropdown();
          }}
          onValueChange={(day) => updateDate('day', day)}
          options={makeOptions(dayOptions, toPersianDigits)}
          textColor={theme.text}
          value={selectedDate.day}
        />
      </View>
      <View style={styles.pickerColumn}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabel}>
          ماه
        </ThemedText>
        <Select
          accessibilityLabel="ماه"
          backgroundColor={theme.background}
          borderColor={theme.backgroundSelected}
          disabled={openDropdown !== null && openDropdown !== 'month'}
          onOpenChange={(open) => {
            if (open) setOpenDropdown('month');
            else closeDropdown();
          }}
          onValueChange={(month) => updateDate('month', month)}
          options={makeOptions(
            jalaliMonthNames.map((_, index) => index + 1),
            (month) => jalaliMonthNames[month - 1],
          )}
          textColor={theme.text}
          value={selectedDate.month}
        />
      </View>
      <YearInput
        key={selectedDate.year}
        value={selectedDate.year}
        min={minYear}
        max={maxYear}
        textColor={theme.text}
        borderColor={theme.backgroundSelected}
        backgroundColor={theme.background}
        onValueChange={(year) => updateDate('year', year)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pickers: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  openPicker: {
    zIndex: 9999,
    elevation: 9999,
  },
  pickerColumn: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  yearField: {
    flex: 1,
    minWidth: 76,
  },
  control: {
    height: 52,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pickerLabel: {
    textAlign: 'center',
  },
  yearInput: {
    height: 52,
    width: '100%',
    paddingLeft: 4,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
    fontFamily: 'Noto Sans Arabic',
    fontSize: 14,
  },
});
