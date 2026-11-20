import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Spacing } from '@/constants/theme';
import { isServiceFormInputType, validateServiceFormField } from '@/lib/form-validation';
import type { ServiceFormField } from '@/types/platform';

type OperatorOrderFormProps = {
  schema: ServiceFormField[];
  response: Record<string, unknown>;
  submitted: boolean;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
};

const supportedTypes = new Set([
  'text',
  'number',
  'phone',
  'email',
  'textarea',
  'nationalId',
  'postalCode',
  'select',
  'checkbox',
  'date',
  'time',
]);

export function OperatorOrderForm({
  schema,
  response,
  submitted,
  onSubmit,
}: OperatorOrderFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(response);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isSupported = schema.every((field) => supportedTypes.has(field.type));

  async function submit() {
    const invalidField = schema.find((field) => validateServiceFormField(field, values[field.key]));
    if (invalidField) {
      setShowValidationErrors(true);
      setError('');
      return;
    }

    const submittedValues = { ...values };
    for (const field of schema) {
      if (field.type === 'number' && typeof submittedValues[field.key] === 'string') {
        submittedValues[field.key] = Number(submittedValues[field.key]);
      }
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(submittedValues);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.card}>
      <View style={styles.heading}>
        <ThemedText type="smallBold" style={styles.rightText}>فرم ارسالی متصدی</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
          {submitted ? 'پاسخ شما ثبت شده است.' : 'لطفاً اطلاعات خواسته‌شده را تکمیل و ارسال کنید.'}
        </ThemedText>
      </View>
      {submitted ? (
        <View style={styles.responseList}>
          {schema.map((field) => (
            <View key={field.key} style={styles.responseRow}>
              <ThemedText type="small" themeColor="textSecondary">{field.label}</ThemedText>
              <ThemedText type="smallBold" style={styles.rightText}>
                {typeof response[field.key] === 'boolean'
                  ? response[field.key] ? 'بله' : 'خیر'
                  : String(response[field.key] ?? '—')}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : isSupported ? (
        <>
          {schema.map((field) => {
            const value = values[field.key];
            if (isServiceFormInputType(field.type)) {
              return (
                <FormTextInput
                  key={field.key}
                  description={field.description}
                  label={field.label}
                  max={field.max}
                  maxLength={field.maxLength}
                  min={field.min}
                  minLength={field.minLength}
                  onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
                  placeholder={field.placeholder ?? field.label}
                  required={field.required}
                  showValidationError={showValidationErrors}
                  type={field.type}
                  validationMessages={field.validationMessages}
                  value={value === undefined || value === null ? '' : String(value)}
                />
              );
            }

            if (field.type === 'select') {
              return (
                <View key={field.key} style={styles.field}>
                  <ThemedText type="smallBold" style={styles.rightText}>
                    {field.label}{field.required ? ' *' : ''}
                  </ThemedText>
                  {field.description ? (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
                      {field.description}
                    </ThemedText>
                  ) : null}
                  <View style={styles.options}>
                    {(field.options ?? []).map((option) => (
                      <Pressable
                        accessibilityRole="button"
                        key={option}
                        onPress={() => setValues((current) => ({ ...current, [field.key]: option }))}
                        style={[styles.option, value === option && styles.selectedOption]}>
                        <ThemedText style={value === option ? styles.selectedOptionText : undefined}>
                          {option}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  {showValidationErrors && field.required && !value ? (
                    <ThemedText type="small" style={styles.errorText}>
                      {`یک گزینه برای «${field.label}» انتخاب کنید.`}
                    </ThemedText>
                  ) : null}
                </View>
              );
            }

            if (field.type === 'checkbox') {
              return (
                <View key={field.key} style={styles.switchRow}>
                  <ThemedText type="smallBold" style={styles.rightText}>
                    {field.label}{field.required ? ' *' : ''}
                  </ThemedText>
                  <Switch
                    onValueChange={(checked) => setValues((current) => ({ ...current, [field.key]: checked }))}
                    value={value === true}
                    trackColor={{ false: '#B8B8B8', true: '#111111' }}
                  />
                </View>
              );
            }

            return (
              <FormTextInput
                key={field.key}
                label={field.label}
                onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
                placeholder={field.placeholder ?? field.label}
                required={field.required}
                showValidationError={showValidationErrors}
                type="text"
                value={typeof value === 'string' ? value : ''}
              />
            );
          })}
          {error ? <ThemedText type="small" style={styles.errorText}>{error}</ThemedText> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void submit()}
            style={[styles.submitButton, isSubmitting && styles.disabled]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Send size={17} color="#FFFFFF" />
                <ThemedText type="smallBold" style={styles.submitButtonText}>ارسال پاسخ فرم</ThemedText>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <ThemedText type="small" style={styles.errorText}>
          این فرم شامل نوع فیلدی است که در نسخهٔ فعلی برنامه پشتیبانی نمی‌شود. لطفاً با متصدی در گفت‌وگو هماهنگ کنید.
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8D8D8',
    backgroundColor: '#F8F8F8',
  },
  heading: { gap: Spacing.one },
  rightText: { textAlign: 'right' },
  field: { gap: Spacing.two },
  options: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.two },
  option: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D0D0D0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: { borderColor: '#111111', backgroundColor: '#111111' },
  selectedOptionText: { color: '#FFFFFF' },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  responseList: { gap: Spacing.two },
  responseRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  submitButton: {
    minHeight: 46,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 14,
    backgroundColor: '#111111',
  },
  submitButtonText: { color: '#FFFFFF' },
  disabled: { opacity: 0.6 },
  errorText: { color: '#B42318', textAlign: 'right' },
});
