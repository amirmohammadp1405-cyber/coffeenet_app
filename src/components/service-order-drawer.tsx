import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { JalaliDatePicker } from '@/components/jalali-date-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormTextInput } from '@/components/ui/form-text-input';
import { Spacing } from '@/constants/theme';
import { createOrder, fetchNeshanAddress } from '@/lib/api';
import { isServiceFormInputType, validateServiceFormField } from '@/lib/form-validation';
import { showSuccessToast } from '@/lib/notifications';
import { getUserProfile, type UserProfile } from '@/lib/user-profile-storage';
import type {
  LocationValue,
  Service,
  ServiceFormField,
  UserProfileField,
} from '@/types/platform';

type ImageValue = {
  uri: string;
  name: string;
  type: string;
};

type ServiceOrderFormProps = {
  service: Service;
};

const fieldEntering = FadeInDown.duration(240);
const fieldExiting = FadeOutUp.duration(180);

function getProfileField(field: ServiceFormField): UserProfileField | undefined {
  if (field.profileField) return field.profileField;
  const normalizeIdentifier = (value: string) =>
    value
      .toLocaleLowerCase()
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\s\u200c_-]+/g, '');
  const key = normalizeIdentifier(field.key);
  const label = normalizeIdentifier(field.label);
  const fieldType: string = field.type;
  const matches = (...identifiers: string[]) =>
    identifiers.some((identifier) => identifier === key || identifier === label);

  if (
    matches(
      'phone',
      'mobile',
      'mobilephone',
      'phonenumber',
      'cellphone',
      'شمارهتماس',
      'شمارهتلفن',
      'شمارههمراه',
      'موبایل',
    ) ||
    fieldType === 'phone'
  ) return 'phone';
  if (
    matches(
      'birthdate',
      'dateofbirth',
      'dob',
      'birth',
      'تاریختولد',
      'روزتولد',
    )
  ) return 'birthDate';
  if (matches('province', 'provincename', 'residenceprovince', 'استان')) return 'province';
  if (matches('city', 'cityname', 'residencecity', 'شهر')) return 'city';
  if (
    matches(
      'name',
      'fullname',
      'applicantname',
      'customername',
      'نام',
      'نامکامل',
      'ناممتقاضی',
      'نامونامخانوادگی',
    )
  ) return 'name';
  if (
    matches('nationalid', 'nationalcode', 'codemelli', 'کدملی', 'شمارهملی') ||
    fieldType === 'nationalId'
  ) return 'nationalId';
  if (
    matches('postalcode', 'zipcode', 'کدپستی') ||
    fieldType === 'postalCode'
  ) return 'postalCode';
  if (matches('address', 'applicantaddress', 'آدرس', 'نشانی')) return 'address';

  return undefined;
}

export function ServiceOrderForm({ service }: ServiceOrderFormProps) {
  const detailImageUrl = service.detailImageUrl ?? service.imageUrl;
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);
  const [datePicker, setDatePicker] = useState<{ key: string } | null>(null);
  const currentField = service.formSchema[currentStep];
  const shouldFocusInput =
    currentField !== undefined &&
    (['text', 'number', 'phone', 'email', 'textarea', 'nationalId', 'postalCode'].includes(currentField.type) ||
      (Platform.OS === 'web' && ['date', 'time'].includes(currentField.type)));

  useEffect(() => {
    if (!shouldFocusInput) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [currentStep, shouldFocusInput]);

  useEffect(() => {
    let isActive = true;
    void getUserProfile()
      .then((savedProfile) => {
        if (isActive) setProfile(savedProfile);
      })
      .catch((profileError: unknown) => {
        if (!isActive) return;
        setError(
          profileError instanceof Error
            ? `بارگذاری اطلاعات پرکاربرد ناموفق بود: ${profileError.message}`
            : `بارگذاری اطلاعات پرکاربرد ناموفق بود: ${String(profileError)}`,
        );
      });

    return () => {
      isActive = false;
    };
  }, []);

  function setValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function renderProfileSuggestion(field: ServiceFormField) {
    const profileField = getProfileField(field);
    const savedValue = profileField ? profile?.[profileField] : '';
    if (!savedValue || String(values[field.key] ?? '').trim()) return null;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`استفاده از ${savedValue} برای ${field.label}`}
        onPress={() => setValue(field.key, savedValue)}
        style={({ pressed }) => [styles.profileSuggestion, pressed && styles.profileSuggestionPressed]}>
        <ThemedText type="small" themeColor="textSecondary">
          استفاده از مقدار ذخیره‌شده: {savedValue}
        </ThemedText>
      </Pressable>
    );
  }

  async function pickImage(field: ServiceFormField) {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setValue(field.key, {
        uri: asset.uri,
        name: asset.fileName ?? `${field.key}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      } satisfies ImageValue);
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : String(pickerError));
    }
  }

  async function pickDocument(field: ServiceFormField) {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: field.mimeTypes ?? ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setValue(field.key, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      } satisfies ImageValue);
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : String(pickerError));
    }
  }

  async function chooseCurrentLocation(field: ServiceFormField) {
    setLoadingLocation(field.key);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('برای ثبت موقعیت، اجازهٔ دسترسی به مکان لازم است.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const location: LocationValue = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setValue(field.key, location);

      const address = await fetchNeshanAddress(location);
      setValue(field.key, { ...location, address: address.address });
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : String(locationError));
    } finally {
      setLoadingLocation('');
    }
  }

  async function submit() {
    const invalidFieldIndex = service.formSchema.findIndex(
      (field) => validateServiceFormField(field, values[field.key]) !== '',
    );
    if (invalidFieldIndex >= 0) {
      const field = service.formSchema[invalidFieldIndex];
      setCurrentStep(invalidFieldIndex);
      setShowValidationErrors(true);
      setError(isServiceFormInputType(field.type) ? '' : validateServiceFormField(field, values[field.key]));
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const submittedValues = { ...values };
      for (const field of service.formSchema) {
        if (field.type === 'number' && typeof submittedValues[field.key] === 'string') {
          submittedValues[field.key] = Number(submittedValues[field.key]);
        }
      }
      const order = await createOrder(service, submittedValues);
      showSuccessToast({
        title: 'سفارش ثبت شد',
        description: `سفارش ${order.orderNumber} با موفقیت ثبت شد.`,
      });
      router.replace({ pathname: '/orders/[id]', params: { id: order.id } });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setIsSubmitting(false);
    }

  }

  function continueForm() {
    const field = service.formSchema[currentStep];
    if (field) {
      const validationError = validateServiceFormField(field, values[field.key]);
      if (validationError) {
        setShowValidationErrors(true);
        setError(isServiceFormInputType(field.type) ? '' : validationError);
        return;
      }
    }

    if (currentStep < service.formSchema.length - 1) {
      setCurrentStep((step) => step + 1);
      setShowValidationErrors(false);
      setError('');
      return;
    }

    void submit();
  }

  function renderField(field: ServiceFormField) {
    const value = values[field.key];
    const pickerValue =
      typeof value === 'string' && field.type === 'time'
        ? new Date(`2000-01-01T${value}:00`)
        : new Date();
    return (
      <View key={field.key} style={styles.field}>
        {!isServiceFormInputType(field.type) ? (
          <ThemedText type="smallBold" style={styles.rightText}>
            {field.label}
            {field.required ? ' *' : ''}
          </ThemedText>
        ) : null}
        {!isServiceFormInputType(field.type) && field.description ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
            {field.description}
          </ThemedText>
        ) : null}
        {isServiceFormInputType(field.type) ? (
          <FormTextInput
            label={field.label}
            description={field.description}
            type={field.type}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
            min={field.min}
            max={field.max}
            validationMessages={field.validationMessages}
            showValidationError={showValidationErrors}
            placeholder={field.placeholder ?? field.label}
            ref={inputRef}
            onChangeText={(text) => setValue(field.key, text)}
            value={value === undefined || value === null ? '' : String(value)}
            nativeProps={{
              ...(field.type === 'textarea' ? { numberOfLines: 4 } : {}),
            }}
          />
        ) : field.type === 'select' ? (
          <View style={styles.options}>
            {(field.options ?? []).map((option) => (
              <Pressable
                accessibilityRole="button"
                key={option}
                onPress={() => setValue(field.key, option)}
                style={[styles.option, value === option && styles.selectedOption]}>
                <ThemedText style={value === option ? styles.selectedOptionText : undefined}>
                  {option}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : field.type === 'checkbox' ? (
          <View style={styles.switchRow}>
            <ThemedText type="small">{value ? 'بله' : 'خیر'}</ThemedText>
            <Switch
              onValueChange={(checked) => setValue(field.key, checked)}
              value={value === true}
              trackColor={{ false: '#B8B8B8', true: '#111111' }}
            />
          </View>
        ) : field.type === 'date' ? (
          <JalaliDatePicker
            accessibilityLabel={field.label}
            onDropdownOpenChange={setIsDateDropdownOpen}
            onChange={(date) => setValue(field.key, date)}
            value={typeof value === 'string' ? value : undefined}
          />
        ) : field.type === 'time' ? (
          <View style={styles.locationContainer}>
            {Platform.OS === 'web' ? (
              <FormTextInput
                type="text"
                placeholder="HH:MM"
                ref={inputRef}
                onChangeText={(text) => setValue(field.key, text)}
                value={typeof value === 'string' ? value : ''}
                nativeProps={{
                  accessibilityLabel: field.label,
                  keyboardType: 'numbers-and-punctuation',
                }}
              />
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDatePicker({ key: field.key })}
                  style={styles.secondaryButton}>
                  <ThemedText type="smallBold">
                    {typeof value === 'string' ? value : 'انتخاب ساعت'}
                  </ThemedText>
                </Pressable>
                {datePicker?.key === field.key ? (
                  <DateTimePicker
                    value={pickerValue}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onValueChange={(_event, date) => {
                      setValue(
                        field.key,
                        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
                      );
                      if (Platform.OS === 'android') setDatePicker(null);
                    }}
                    onDismiss={() => setDatePicker(null)}
                  />
                ) : null}
              </>
            )}
          </View>
        ) : field.type === 'image' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickImage(field)}
            style={styles.secondaryButton}>
            <ThemedText type="smallBold">{value ? 'تغییر تصویر' : 'انتخاب تصویر'}</ThemedText>
          </Pressable>
        ) : field.type === 'file' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickDocument(field)}
            style={styles.secondaryButton}>
            <ThemedText type="smallBold">
              {typeof value === 'object' && value !== null && 'name' in value
                ? String(value.name)
                : 'انتخاب فایل'}
            </ThemedText>
          </Pressable>
        ) : field.type === 'location' ? (
          <View style={styles.locationContainer}>
            <Pressable
              accessibilityRole="button"
              disabled={loadingLocation === field.key}
              onPress={() => void chooseCurrentLocation(field)}
              style={styles.secondaryButton}>
              {loadingLocation === field.key ? (
                <ActivityIndicator color="#111111" />
              ) : (
                <ThemedText type="smallBold">ثبت موقعیت فعلی با نشان</ThemedText>
              )}
            </Pressable>
            {typeof value === 'object' &&
            value !== null &&
            'latitude' in value &&
            'longitude' in value ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
                {'address' in value && typeof value.address === 'string' && value.address
                  ? value.address
                  : `${Number(value.latitude).toFixed(5)}, ${Number(value.longitude).toFixed(5)}`}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
        {(field.type === 'image' || field.type === 'file') &&
        typeof value === 'object' &&
        value !== null &&
        'uri' in value &&
        'type' in value &&
        typeof value.type === 'string' &&
        value.type.startsWith('image/') ? (
          <Image
            contentFit="cover"
            source={{ uri: String(value.uri) }}
            style={styles.selectedImage}
          />
        ) : null}
        {renderProfileSuggestion(field)}
      </View>
    );
  }

  const stepCount = Math.max(service.formSchema.length, 1);
  const progress = ((currentStep + 1) / stepCount) * 100;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      scrollEnabled={!isDateDropdownOpen}
      showsVerticalScrollIndicator={false}>
      {detailImageUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: detailImageUrl }}
          style={styles.heroImage}
        />
      ) : null}
      <View style={styles.stepHeader}>
        <ThemedText type="small" themeColor="textSecondary">
          {service.formSchema.length
            ? `مرحلهٔ ${new Intl.NumberFormat('fa-IR').format(currentStep + 1)} از ${new Intl.NumberFormat('fa-IR').format(stepCount)}`
            : 'تکمیل سفارش'}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.rightText}>{service.title}</ThemedText>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
      <ThemedText type="default" themeColor="textSecondary" style={styles.rightText}>
        {service.formSchema.length
          ? 'برای ثبت سفارش، اطلاعات زیر را مرحله‌به‌مرحله تکمیل کنید.'
          : 'برای ثبت این خدمت اطلاعات اضافه‌ای لازم نیست.'}
      </ThemedText>
      <Animated.View
        key={currentField?.key ?? 'empty-step'}
        entering={fieldEntering}
        exiting={fieldExiting}
        style={isDateDropdownOpen && styles.openDateField}>
        {currentField ? (
          renderField(currentField)
        ) : (
          <ThemedView style={styles.emptyStep}>
            <ThemedText type="smallBold" style={styles.rightText}>{service.title}</ThemedText>
          </ThemedView>
        )}
      </Animated.View>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      <View style={styles.navigationButtons}>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => {
            if (currentStep === 0) router.back();
            else {
              setCurrentStep((step) => step - 1);
              setError('');
              setShowValidationErrors(false);
            }
          }}
          style={[styles.secondaryButton, styles.navigationButton, isSubmitting && styles.disabled]}>
          <ThemedText type="smallBold">{currentStep === 0 ? 'بازگشت' : 'مرحلهٔ قبل'}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={continueForm}
          style={[styles.submitButton, styles.navigationButton, isSubmitting && styles.disabled]}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText type="smallBold" style={styles.submitText}>
              {currentStep < service.formSchema.length - 1
                ? 'مرحلهٔ بعد'
                : 'ثبت سفارش و ادامه به پرداخت'}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  openDateField: {
    zIndex: 9999,
    elevation: 9999,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 18,
  },
  stepHeader: {
    gap: Spacing.two,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#111111',
  },
  rightText: {
    textAlign: 'right',
  },
  emptyStep: {
    padding: Spacing.four,
    borderRadius: 16,
    backgroundColor: '#F1F1F1',
  },
  field: {
    gap: Spacing.two,
  },
  options: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8D8D8',
  },
  selectedOption: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  selectedImage: {
    height: 180,
    borderRadius: 16,
  },
  locationContainer: {
    gap: Spacing.two,
  },
  profileSuggestion: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 10,
  },
  profileSuggestionPressed: {
    backgroundColor: '#0000000A',
  },
  navigationButtons: {
    flexDirection: 'row-reverse',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  navigationButton: {
    flex: 1,
  },
  errorText: {
    color: '#B42318',
    textAlign: 'right',
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#111111',
  },
  submitText: {
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.6,
  },
});
