import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  MessageCircle,
  Moon,
  Save,
  Send,
  Sun,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { JalaliDatePicker } from '@/components/jalali-date-picker';
import { Spacing } from '@/constants/theme';
import { AppUpdateCard } from '@/components/app-update-card';
import { FormTextInput } from '@/components/ui/form-text-input';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useTheme } from '@/hooks/use-theme';
import { fetchAppSettings, openWebLink } from '@/lib/api';
import { validateTextField } from '@/lib/form-validation';
import { showErrorToast, showSuccessToast } from '@/lib/notifications';
import { getUserProfile, saveUserProfile, type UserProfile } from '@/lib/user-profile-storage';
import type { AppSettings } from '@/types/platform';

const defaultAppSettings: AppSettings = {
  aboutText: 'کافینت امیران همراه شما برای دسترسی آسان به خدمات و اطلاع‌رسانی‌های کافینت.',
  instagramUrl: 'https://www.instagram.com/',
  telegramUrl: 'https://t.me/',
  whatsappUrl: 'https://www.whatsapp.com/',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const appUpdate = useAppUpdate();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    nationalId: '',
    postalCode: '',
    address: '',
    phone: '',
    birthDate: '',
    province: '',
    city: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showProfileValidationErrors, setShowProfileValidationErrors] = useState(false);
  const [appSettings, setAppSettings] = useState(defaultAppSettings);
  const [appSettingsError, setAppSettingsError] = useState('');
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [selectedAppearance, setSelectedAppearance] = useState<'light' | 'dark'>(
    colorScheme === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    let isMounted = true;
    void getUserProfile()
      .then((storedProfile) => {
        if (isMounted) setProfile(storedProfile);
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? `بارگذاری اطلاعات ذخیره‌شده ناموفق بود: ${loadError.message}`
              : `بارگذاری اطلاعات ذخیره‌شده ناموفق بود: ${String(loadError)}`,
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    void fetchAppSettings()
      .then((storedSettings) => {
        if (isMounted) setAppSettings(storedSettings);
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setAppSettingsError(
            loadError instanceof Error
              ? `بارگذاری تنظیمات از پایگاه داده ناموفق بود: ${loadError.message}`
              : `بارگذاری تنظیمات از پایگاه داده ناموفق بود: ${String(loadError)}`,
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(field: keyof UserProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function handleSave() {
    setError('');
    setShowProfileValidationErrors(true);
    const profileErrors = [
      validateTextField(
        { type: 'text', label: 'نام و نام خانوادگی', maxLength: 120 },
        profile.name,
      ),
      validateTextField({ type: 'nationalId', label: 'شماره ملی' }, profile.nationalId),
      validateTextField({ type: 'postalCode', label: 'کد پستی' }, profile.postalCode),
      validateTextField({ type: 'textarea', label: 'آدرس', maxLength: 500 }, profile.address),
      validateTextField({ type: 'phone', label: 'شماره موبایل' }, profile.phone),
    ];
    if (profileErrors.some(Boolean)) {
      setError('لطفاً خطاهای مشخص‌شده را اصلاح کنید.');
      return;
    }

    setIsSaving(true);
    try {
      await saveUserProfile(profile);
      showSuccessToast({
        title: 'اطلاعات ذخیره شد',
        description: 'اطلاعات شما روی همین دستگاه ذخیره شد.',
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `ذخیرهٔ اطلاعات ناموفق بود: ${saveError.message}`
          : `ذخیرهٔ اطلاعات ناموفق بود: ${String(saveError)}`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function openSocialLink(url: string) {
    try {
      await openWebLink(url);
    } catch (linkError: unknown) {
      showErrorToast({
        title: 'باز کردن لینک ناموفق بود',
        description: linkError instanceof Error ? linkError.message : String(linkError),
      });
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
          style={styles.keyboard}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              تنظیمات
            </ThemedText>
            <Pressable
              accessibilityLabel="بازگشت"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.back()}
              style={styles.backButton}>
              <ArrowLeft color={theme.text} size={22} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedView style={styles.profileCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isProfileExpanded }}
                onPress={() => setIsProfileExpanded((expanded) => !expanded)}
                style={({ pressed }) => [
                  styles.profileAccordionHeader,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.profileHeadingText}>
                  <ThemedText type="smallBold" style={styles.rightText}>
                    اطلاعات پرکاربرد
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
                    نام، شماره موبایل، تاریخ تولد و نشانی
                  </ThemedText>
                </View>
                <View style={styles.profileHeadingIcons}>
                  <ChevronDown
                    color={theme.textSecondary}
                    size={20}
                    style={{
                      transform: [{ rotate: isProfileExpanded ? '180deg' : '0deg' }],
                    }}
                  />
                  <View
                    style={[
                      styles.profileIconCircle,
                      { backgroundColor: theme.backgroundElement },
                    ]}>
                    <UserRound color={theme.text} size={20} />
                  </View>
                </View>
              </Pressable>

              {isProfileExpanded ? (
                <View style={styles.profileContent}>
                  {isLoading ? (
                    <View style={styles.loading}>
                      <ActivityIndicator color={theme.text} />
                      <ThemedText type="small" themeColor="textSecondary">
                        در حال بارگذاری اطلاعات...
                      </ThemedText>
                    </View>
                  ) : (
                    <>
                      <FormTextInput
                        label="نام و نام خانوادگی"
                        type="text"
                        maxLength={120}
                        onChangeText={(value) => updateField('name', value)}
                        placeholder="نام شما"
                        nativeProps={{ autoComplete: 'name' }}
                        showValidationError={showProfileValidationErrors}
                        value={profile.name}
                      />
                      <FormTextInput
                        label="شماره موبایل"
                        type="phone"
                        maxLength={15}
                        onChangeText={(value) => updateField('phone', value)}
                        placeholder="شماره موبایل"
                        nativeProps={{ autoComplete: 'tel' }}
                        showValidationError={showProfileValidationErrors}
                        value={profile.phone}
                      />
                      <View style={styles.birthDateField}>
                        <ThemedText type="smallBold" style={styles.rightText}>
                          تاریخ تولد
                        </ThemedText>
                        <JalaliDatePicker
                          accessibilityLabel="تاریخ تولد"
                          onChange={(value) => updateField('birthDate', value)}
                          value={profile.birthDate || undefined}
                        />
                      </View>
                      <FormTextInput
                        label="استان"
                        type="text"
                        maxLength={100}
                        onChangeText={(value) => updateField('province', value)}
                        placeholder="استان محل سکونت"
                        value={profile.province}
                      />
                      <FormTextInput
                        label="شهر"
                        type="text"
                        maxLength={100}
                        onChangeText={(value) => updateField('city', value)}
                        placeholder="شهر محل سکونت"
                        value={profile.city}
                      />
                      <FormTextInput
                        label="شماره ملی"
                        type="nationalId"
                        maxLength={10}
                        onChangeText={(value) => updateField('nationalId', value)}
                        placeholder="۱۰ رقم"
                        showValidationError={showProfileValidationErrors}
                        value={profile.nationalId}
                      />
                      <FormTextInput
                        label="کد پستی"
                        type="postalCode"
                        maxLength={10}
                        onChangeText={(value) => updateField('postalCode', value)}
                        placeholder="۱۰ رقم"
                        showValidationError={showProfileValidationErrors}
                        value={profile.postalCode}
                      />
                      <FormTextInput
                        label="آدرس"
                        type="textarea"
                        maxLength={500}
                        onChangeText={(value) => updateField('address', value)}
                        placeholder="استان، شهر، خیابان، پلاک..."
                        nativeProps={{ autoComplete: 'street-address' }}
                        showValidationError={showProfileValidationErrors}
                        value={profile.address}
                      />
                    </>
                  )}

                  {error ? (
                    <ThemedText type="small" style={styles.errorText}>
                      {error}
                    </ThemedText>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isLoading || isSaving }}
                    disabled={isLoading || isSaving}
                    onPress={() => void handleSave()}
                    style={({ pressed }) => [
                      styles.saveButton,
                      pressed && styles.pressed,
                      (isLoading || isSaving) && styles.disabled,
                    ]}>
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <ThemedText type="smallBold" style={styles.actionButtonText}>
                          ذخیرهٔ اطلاعات
                        </ThemedText>
                        <Save color="#FFFFFF" size={18} />
                      </>
                    )}
                  </Pressable>

                  <ThemedText type="small" themeColor="textSecondary" style={styles.privacyNote}>
                    اطلاعات شما فقط به‌صورت محلی روی دستگاه ذخیره می‌شود.
                  </ThemedText>
                </View>
              ) : null}
            </ThemedView>

            <ThemedView style={styles.formCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                نسخهٔ برنامه
              </ThemedText>
              <View
                style={[
                  styles.versionRow,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText type="small" themeColor="textSecondary">
                  نسخهٔ فعلی
                </ThemedText>
                <ThemedText type="smallBold">
                  {appUpdate.currentVersion}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: appUpdate.isChecking }}
                disabled={appUpdate.isChecking}
                onPress={() => void appUpdate.checkForUpdate()}
                style={({ pressed }) => [
                  styles.updateButton,
                  pressed && styles.pressed,
                  appUpdate.isChecking && styles.disabled,
                ]}>
                <ThemedText type="smallBold" style={styles.actionButtonText}>
                  {appUpdate.isChecking ? 'در حال بررسی...' : 'بررسی به‌روزرسانی'}
                </ThemedText>
              </Pressable>
              {appUpdate.error ? (
                <ThemedText type="small" style={styles.errorText}>
                  بررسی نسخه ناموفق بود: {appUpdate.error}
                </ThemedText>
              ) : null}
              {appUpdate.hasChecked && !appUpdate.error && !appUpdate.updateAvailable ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
                  {appUpdate.release
                    ? 'از آخرین نسخهٔ منتشرشده استفاده می‌کنید.'
                    : 'نسخهٔ جدیدی در پایگاه داده ثبت نشده است.'}
                </ThemedText>
              ) : null}
              {appUpdate.updateAvailable && appUpdate.release ? (
                <AppUpdateCard release={appUpdate.release} />
              ) : null}

              <View style={styles.sectionHeading}>
                <ThemedText type="smallBold">ظاهر برنامه</ThemedText>
                <ThemedText type="code" themeColor="textSecondary">
                  نمایشی
                </ThemedText>
              </View>
              <View
                style={[
                  styles.appearanceOptions,
                  { backgroundColor: theme.backgroundElement },
                ]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedAppearance === 'light' }}
                  onPress={() => setSelectedAppearance('light')}
                  style={[
                    styles.appearanceOption,
                    selectedAppearance === 'light' && { backgroundColor: theme.background },
                  ]}>
                  <Sun color={theme.text} size={18} />
                  <ThemedText type="smallBold">روشن</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedAppearance === 'dark' }}
                  onPress={() => setSelectedAppearance('dark')}
                  style={[
                    styles.appearanceOption,
                    selectedAppearance === 'dark' && { backgroundColor: theme.background },
                  ]}>
                  <Moon color={theme.text} size={18} />
                  <ThemedText type="smallBold">تیره</ThemedText>
                </Pressable>
              </View>
            </ThemedView>

            <ThemedView style={styles.formCard}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                دربارهٔ ما
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.rightText}>
                {appSettings.aboutText}
              </ThemedText>
              {appSettingsError ? (
                <ThemedText type="small" style={styles.errorText}>
                  {appSettingsError}
                </ThemedText>
              ) : null}
              {appSettings.instagramUrl || appSettings.telegramUrl || appSettings.whatsappUrl ? (
                <>
                  <ThemedText type="smallBold" style={styles.sectionTitle}>
                    ما را در شبکه‌های اجتماعی دنبال کنید
                  </ThemedText>
                  <View style={styles.socialLinks}>
                    {appSettings.instagramUrl ? (
                      <SocialButton
                        label="اینستاگرام"
                        Icon={Camera}
                        url={appSettings.instagramUrl}
                        onPress={openSocialLink}
                        backgroundColor={theme.backgroundElement}
                        iconColor={theme.text}
                      />
                    ) : null}
                    {appSettings.telegramUrl ? (
                      <SocialButton
                        label="تلگرام"
                        Icon={Send}
                        url={appSettings.telegramUrl}
                        onPress={openSocialLink}
                        backgroundColor={theme.backgroundElement}
                        iconColor={theme.text}
                      />
                    ) : null}
                    {appSettings.whatsappUrl ? (
                      <SocialButton
                        label="واتساپ"
                        Icon={MessageCircle}
                        url={appSettings.whatsappUrl}
                        onPress={openSocialLink}
                        backgroundColor={theme.backgroundElement}
                        iconColor={theme.text}
                      />
                    ) : null}
                  </View>
                </>
              ) : null}
            </ThemedView>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

type SocialButtonProps = {
  label: string;
  Icon: typeof Camera;
  url: string;
  onPress: (url: string) => void;
  backgroundColor: string;
  iconColor: string;
};

function SocialButton({
  label,
  Icon,
  url,
  onPress,
  backgroundColor,
  iconColor,
}: SocialButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="link"
      onPress={() => onPress(url)}
      style={({ pressed }) => [
        styles.socialButton,
        { backgroundColor },
        pressed && styles.pressed,
      ]}>
      <Icon color={iconColor} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 34,
    lineHeight: 42,
    textAlign: 'right',
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  profileCard: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E1E1E1',
    borderRadius: 22,
  },
  profileAccordionHeader: {
    minHeight: 76,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  profileHeadingText: {
    flex: 1,
    gap: Spacing.one,
  },
  profileHeadingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileIconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  profileContent: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E1E1',
  },
  birthDateField: {
    gap: Spacing.two,
  },
  rightText: {
    textAlign: 'right',
  },
  formCard: {
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: 20,
  },
  sectionHeading: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  sectionTitle: {
    textAlign: 'right',
  },
  versionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  updateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#111111',
    paddingVertical: 12,
  },
  appearanceOptions: {
    flexDirection: 'row-reverse',
    gap: Spacing.one,
    borderRadius: 16,
    padding: 5,
  },
  appearanceOption: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    paddingVertical: 10,
  },
  socialLinks: {
    flexDirection: 'row-reverse',
    gap: Spacing.two,
  },
  socialButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  loading: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  saveButton: {
    minHeight: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 16,
    backgroundColor: '#111111',
    paddingHorizontal: Spacing.four,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#B42318',
    textAlign: 'right',
  },
  privacyNote: {
    textAlign: 'center',
  },
});
