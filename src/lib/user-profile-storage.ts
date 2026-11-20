import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const USER_PROFILE_STORAGE_KEYS = {
  name: 'coffeenet.user.name',
  nationalId: 'coffeenet.user.nationalId',
  postalCode: 'coffeenet.user.postalCode',
  address: 'coffeenet.user.address',
  phone: 'coffeenet.user.phone',
  birthDate: 'coffeenet.user.birthDate',
  province: 'coffeenet.user.province',
  city: 'coffeenet.user.city',
} as const;

export type UserProfile = {
  name: string;
  nationalId: string;
  postalCode: string;
  address: string;
  phone: string;
  birthDate: string;
  province: string;
  city: string;
};

const profileFields: (keyof UserProfile)[] = [
  'name',
  'nationalId',
  'postalCode',
  'address',
  'phone',
  'birthDate',
  'province',
  'city',
];

async function getValue(key: string) {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

async function setValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeValue(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getUserProfile(): Promise<UserProfile> {
  const entries = await Promise.all(
    profileFields.map(async (field) => [
      field,
      (await getValue(USER_PROFILE_STORAGE_KEYS[field])) ?? '',
    ] as const),
  );
  return Object.fromEntries(entries) as UserProfile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await Promise.all(
    profileFields.map(async (field) => {
      const key = USER_PROFILE_STORAGE_KEYS[field];
      const value = profile[field].trim();
      if (value) {
        await setValue(key, value);
      } else {
        await removeValue(key);
      }
    }),
  );
}
