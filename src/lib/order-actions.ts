import { Platform } from 'react-native';
import { sileo } from 'sileo-native';

export function confirmOrderCancellation(orderNumber: string, onConfirm: () => void) {
  const title = 'لغو سفارش';
  const message = `از لغو سفارش ${orderNumber} مطمئن هستید؟`;

  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }

  sileo.warning({
    title,
    description: message,
    duration: null,
    buttons: [
      { title: 'بازگشت', variant: 'neutral', dismiss: true, onPress: () => {} },
      { title: 'بله، لغو شود', variant: 'error', dismiss: true, onPress: onConfirm },
    ],
  });
}
