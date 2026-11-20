import type { ServiceFormField, ServiceFormInputType } from '@/types/platform';

type TextFieldValidation = Pick<
  ServiceFormField,
  'type' | 'label' | 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'validationMessages'
>;

const digitMap: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit] ?? digit);
}

export function isValidIranianNationalId(value: string) {
  const digits = normalizeDigits(value);
  if (!/^\d{10}$/.test(digits) || /^(\d)\1{9}$/.test(digits)) return false;

  const checksum = Number(digits[9]);
  const sum = digits
    .slice(0, 9)
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  return checksum === (remainder < 2 ? remainder : 11 - remainder);
}

export function isServiceFormInputType(
  type: ServiceFormField['type'],
): type is ServiceFormInputType {
  return (
    type === 'text' ||
    type === 'number' ||
    type === 'phone' ||
    type === 'email' ||
    type === 'textarea' ||
    type === 'nationalId' ||
    type === 'postalCode'
  );
}

function validationMessage(
  field: TextFieldValidation,
  key: keyof NonNullable<ServiceFormField['validationMessages']>,
  fallback: string,
) {
  const template = field.validationMessages?.[key];
  if (!template) return fallback;

  const values: Record<string, string> = {
    label: field.label,
    minLength: String(field.minLength ?? ''),
    maxLength: String(field.maxLength ?? ''),
    min: String(field.min ?? ''),
    max: String(field.max ?? ''),
  };
  return template.replace(/\{\{(label|minLength|maxLength|min|max)\}\}/g, (_match, token: string) =>
    values[token] ?? '',
  );
}

export function validateTextField(field: TextFieldValidation, value: unknown): string {
  if (!isServiceFormInputType(field.type)) return '';

  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '');
  if (isEmpty) {
    return field.required
      ? validationMessage(field, 'required', `وارد کردن «${field.label}» الزامی است.`)
      : '';
  }

  if (field.type === 'number') {
    const numberValue =
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isFinite(numberValue)) {
      return validationMessage(field, 'invalid', `مقدار «${field.label}» باید عددی باشد.`);
    }
    if (field.min !== undefined && numberValue < field.min) {
      return validationMessage(field, 'min', `مقدار «${field.label}» نباید کمتر از ${field.min} باشد.`);
    }
    if (field.max !== undefined && numberValue > field.max) {
      return validationMessage(field, 'max', `مقدار «${field.label}» نباید بیشتر از ${field.max} باشد.`);
    }
    return '';
  }

  if (typeof value !== 'string') {
    return validationMessage(field, 'invalid', `مقدار «${field.label}» معتبر نیست.`);
  }

  const normalized = normalizeDigits(value);
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return validationMessage(field, 'invalid', `ایمیل «${field.label}» معتبر نیست.`);
  }
  if (field.type === 'phone') {
    const phone = normalized.replace(/[\s().-]/g, '');
    if (!/^\+?\d{7,15}$/.test(phone)) {
      return validationMessage(field, 'invalid', `شمارهٔ تلفن «${field.label}» معتبر نیست.`);
    }
  }
  if (field.type === 'nationalId' && !isValidIranianNationalId(normalized)) {
    return validationMessage(field, 'invalid', `کد ملی «${field.label}» معتبر نیست.`);
  }
  if (field.type === 'postalCode' && !/^\d{10}$/.test(normalized)) {
    return validationMessage(field, 'invalid', `کد پستی «${field.label}» باید ۱۰ رقم باشد.`);
  }

  const length =
    field.type === 'phone'
      ? normalized.replace(/\D/g, '').length
      : normalized.length;
  if (field.minLength !== undefined && length < field.minLength) {
    return validationMessage(field, 'minLength', `«${field.label}» باید حداقل ${field.minLength} نویسه باشد.`);
  }
  if (field.maxLength !== undefined && length > field.maxLength) {
    return validationMessage(field, 'maxLength', `«${field.label}» نباید بیشتر از ${field.maxLength} نویسه باشد.`);
  }

  return '';
}

export function validateServiceFormField(field: ServiceFormField, value: unknown): string {
  if (isServiceFormInputType(field.type)) return validateTextField(field, value);

  const isEmpty = value === undefined || value === null || value === '';
  if (isEmpty) return field.required ? `وارد کردن «${field.label}» الزامی است.` : '';

  if (field.type === 'select') {
    return field.options?.includes(String(value)) ? '' : `یک گزینه برای «${field.label}» انتخاب کنید.`;
  }
  if (field.type === 'checkbox') {
    return typeof value === 'boolean' ? '' : `مقدار «${field.label}» معتبر نیست.`;
  }
  if (field.type === 'date') {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? ''
      : `تاریخ «${field.label}» را انتخاب کنید.`;
  }
  if (field.type === 'time') {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
      ? ''
      : `ساعت «${field.label}» را انتخاب کنید.`;
  }
  if (field.type === 'location') {
    return (
      typeof value === 'object' &&
      value !== null &&
      'latitude' in value &&
      'longitude' in value &&
      Number.isFinite(value.latitude) &&
      Number.isFinite(value.longitude)
    )
      ? ''
      : `موقعیت «${field.label}» معتبر نیست.`;
  }
  if (field.type === 'image' || field.type === 'file') return '';

  return `نوع فیلد «${field.label}» پشتیبانی نمی‌شود.`;
}
