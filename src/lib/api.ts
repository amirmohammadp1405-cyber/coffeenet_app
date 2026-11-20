import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import { File as ExpoFile } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import EventSource from 'react-native-sse';
import { Platform } from 'react-native';

import type {
  CafeStatusInfo,
  AppSettings,
  AppVersion,
  Announcement,
  LocationValue,
  Order,
  OrderAttachment,
  OrderMessage,
  PaymentInstructions,
  Service,
  ServiceAnnouncement,
  ServiceCategory,
} from '@/types/platform';

const guestKeyName = 'coffeenet.guest-key';
const localOrdersName = 'coffeenet.order-ids';

export function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    throw new Error('آدرس شبکهٔ API در دسترس نیست؛ EXPO_PUBLIC_API_URL را تنظیم کنید.');
  }

  const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
  return `http://${host}:3000`;
}

export async function getGuestKey() {
  if (Platform.OS === 'web') {
    const stored = await AsyncStorage.getItem(guestKeyName);
    if (stored) return stored;
    const created = Crypto.randomUUID();
    await AsyncStorage.setItem(guestKeyName, created);
    return created;
  }

  const stored = await SecureStore.getItemAsync(guestKeyName);
  if (stored) return stored;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(guestKeyName, created);
  return created;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const guestKey = await getGuestKey();
  const headers = new Headers(init?.headers);
  headers.set('x-device-key', guestKey);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const request = init?.body instanceof FormData && Platform.OS !== 'web' ? expoFetch : fetch;
  const response = await request(`${getApiBaseUrl()}${path}`, { ...init, headers });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`پاسخ سرور قابل‌خواندن نیست (${response.status}).`);
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `پاسخ سرور: ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function fetchServices() {
  return requestJson<Service[]>('/api/services');
}

export function fetchServiceCategories() {
  return requestJson<ServiceCategory[]>('/api/service-categories');
}

export type AssistantChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AssistantSuggestedService = Pick<
  Service,
  'id' | 'title' | 'summary' | 'basePrice' | 'priceBreakdown' | 'processingMinutes'
>;

export type AssistantChatResponse = {
  reply: string;
  suggestions: AssistantSuggestedService[];
};

export function sendAssistantMessage(messages: AssistantChatMessage[]) {
  return requestJson<AssistantChatResponse>('/api/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export function fetchCafeStatus() {
  return requestJson<CafeStatusInfo>('/api/cafe/status');
}

export function fetchAppSettings() {
  return requestJson<AppSettings>('/api/app-settings');
}

export function fetchAnnouncements() {
  return requestJson<Announcement[]>('/api/announcements');
}

export function fetchServiceAnnouncements() {
  return requestJson<ServiceAnnouncement[]>('/api/service-announcements');
}

export function fetchLatestAppVersion() {
  return requestJson<AppVersion | null>('/api/app-version');
}

export async function openWebLink(link: string) {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new Error('لینک معتبر نیست.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('فقط لینک‌های وب (HTTP یا HTTPS) قابل باز کردن هستند.');
  }

  await Linking.openURL(url.toString());
}

export function fetchPaymentInstructions() {
  return requestJson<PaymentInstructions>('/api/payment/instructions');
}

export async function fetchNeshanAddress(location: LocationValue) {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lng: String(location.longitude),
  });
  return requestJson<{ address: string }>(`/api/location/reverse?${params.toString()}`);
}

async function appendUploadFile(
  form: FormData,
  fieldName: string,
  asset: { uri: string; name: string; type: string },
) {
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('خواندن فایل انتخاب‌شده ناموفق بود.');
    form.append(fieldName, await response.blob(), asset.name);
    return;
  }
  const file = new ExpoFile(asset.uri);
  form.append(fieldName, file);
}

export async function createOrder(service: Service, values: Record<string, unknown>) {
  const form = new FormData();
  form.append('serviceId', service.id);

  const formData: Record<string, unknown> = {};
  const imageEntries: [string, { uri: string; name: string; type: string }][] = [];
  for (const [key, value] of Object.entries(values)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      'uri' in value &&
      typeof value.uri === 'string' &&
      'name' in value &&
      typeof value.name === 'string' &&
      'type' in value &&
      typeof value.type === 'string'
    ) {
      imageEntries.push([
        key,
        { uri: value.uri, name: value.name, type: value.type },
      ]);
    } else {
      formData[key] = value;
    }
  }
  form.append('formData', JSON.stringify(formData));
  for (const [key, asset] of imageEntries) {
    await appendUploadFile(form, `file:${key}`, asset);
  }

  const order = await requestJson<Order>('/api/orders', { method: 'POST', body: form });
  await saveLocalOrderId(order.id);
  return order;
}

export async function createFreeOrder() {
  const order = await requestJson<Order>('/api/orders/free', { method: 'POST' });
  await saveLocalOrderId(order.id);
  return order;
}

export async function getLocalOrderIds() {
  const value = await AsyncStorage.getItem(localOrdersName);
  if (!value) return [];
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    throw new Error('فهرست محلی سفارش‌ها خراب است. داده‌های برنامه را بررسی کنید.');
  }
}

async function saveLocalOrderId(id: string) {
  const ids = await getLocalOrderIds();
  await AsyncStorage.setItem(localOrdersName, JSON.stringify([id, ...ids.filter((item) => item !== id)]));
}

export async function fetchLocalOrders() {
  const ids = await getLocalOrderIds();
  if (!ids.length) return [];
  const params = new URLSearchParams({ ids: ids.slice(0, 50).join(',') });
  return requestJson<Order[]>(`/api/orders?${params.toString()}`);
}

export function fetchOrder(id: string) {
  return requestJson<Order>(`/api/orders/${encodeURIComponent(id)}`);
}

export function submitOperatorForm(id: string, values: Record<string, unknown>) {
  return requestJson<Order>(`/api/orders/${encodeURIComponent(id)}/form-response`, {
    method: 'POST',
    body: JSON.stringify({ values }),
  });
}

export function canCancelOrder(order: Pick<Order, 'status' | 'orderType'>) {
  return (
    (order.orderType === 'free' && order.status === 'awaiting_operator') ||
    order.status === 'awaiting_payment' ||
    order.status === 'payment_review'
  );
}

export function cancelOrder(id: string) {
  return requestJson<Order>(`/api/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
  });
}

export function fetchOrderMessages(id: string) {
  return requestJson<OrderMessage[]>(`/api/orders/${encodeURIComponent(id)}/messages`);
}

export function fetchOrderAttachments(id: string) {
  return requestJson<OrderAttachment[]>(`/api/orders/${encodeURIComponent(id)}/attachments`);
}

export async function sendOrderMessage(
  id: string,
  body: string,
  attachment?: { uri: string; name: string; type: string },
) {
  if (attachment) {
    const form = new FormData();
    form.append('body', body);
    await appendUploadFile(form, 'attachment', attachment);
    return requestJson<OrderMessage>(`/api/orders/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: form,
    });
  }

  return requestJson<OrderMessage>(`/api/orders/${encodeURIComponent(id)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function sendPaymentReceipt(
  id: string,
  asset: { uri: string; name: string; type: string },
) {
  const form = new FormData();
  form.append('body', 'تصویر رسید پرداخت');
  form.append('paymentReceipt', 'true');
  await appendUploadFile(form, 'attachment', asset);
  await requestJson<unknown>(
    `/api/orders/${encodeURIComponent(id)}/messages`,
    { method: 'POST', body: form },
  );
  const [order, messages] = await Promise.all([
    fetchOrder(id),
    fetchOrderMessages(id),
  ]);
  const message = messages
    .filter(
      (item) =>
        item.sender === 'guest' &&
        item.body === 'تصویر رسید پرداخت' &&
        item.attachmentUrl,
    )
    .sort((left, right) => new Date(right.created).getTime() - new Date(left.created).getTime())[0];

  if (!message) {
    throw new Error('رسید ارسال شد، اما دریافت آن در گفت‌وگو ناموفق بود. صفحه را دوباره بارگیری کنید.');
  }

  return {
    message,
    order,
    statusUpdated: order.status !== 'awaiting_payment',
  };
}

export function subscribeToOrder(
  id: string,
  onOrder: (order: Order) => void,
  onMessage: (message: OrderMessage) => void,
  onError: () => void,
) {
  const sourcePromise = getGuestKey()
    .then((guestKey) => {
      const source = new EventSource<'order' | 'message'>(
        `${getApiBaseUrl()}/api/orders/${encodeURIComponent(id)}/events`,
        { headers: { 'x-device-key': guestKey, Accept: 'text/event-stream' }, pollingInterval: 5000 },
      );
      source.addEventListener('order', (event) => {
        if (event.data) onOrder(JSON.parse(event.data) as Order);
      });
      source.addEventListener('message', (event) => {
        if (event.data) onMessage(JSON.parse(event.data) as OrderMessage);
      });
      source.addEventListener('error', () => onError());
      return source;
    })
    .catch((error: unknown) => {
      onError();
      console.error('Could not start order event stream:', error);
      return null;
    });

  return () => {
    void sourcePromise.then((source) => source?.close());
  };
}
