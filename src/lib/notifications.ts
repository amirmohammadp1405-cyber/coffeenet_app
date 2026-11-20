import { sileo } from 'sileo-native';

type ToastMessage = {
  title: string;
  description?: string;
};

export function showSuccessToast({ title, description }: ToastMessage) {
  sileo.success({ title, ...(description ? { description } : {}) });
}

export function showErrorToast({ title, description }: ToastMessage) {
  sileo.error({ title, ...(description ? { description } : {}) });
}
