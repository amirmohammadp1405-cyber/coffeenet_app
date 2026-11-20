import {
  isValidJalaaliDate,
  jalaaliMonthLength,
  toGregorian,
  toJalaali,
} from 'jalaali-js';

export type JalaliDateParts = {
  year: number;
  month: number;
  day: number;
};

export const jalaliMonthNames = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export function toPersianDigits(value: number | string) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function createUtcDate(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

export function getJalaliDate(value: string): JalaliDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = createUtcDate(year, month, day);

  if (
    year < 561 ||
    year > 3798 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const jalaliDate = toJalaali(year, month, day);
  return {
    year: jalaliDate.jy,
    month: jalaliDate.jm,
    day: jalaliDate.jd,
  };
}

export function getTodayJalaliDate(now = new Date()): JalaliDateParts {
  const date = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: date.jy, month: date.jm, day: date.jd };
}

export function getDaysInJalaliMonth(year: number, month: number) {
  if (year < -61 || year > 3177 || month < 1 || month > 12) return 0;
  return jalaaliMonthLength(year, month);
}

export function jalaliDateToGregorian(year: number, month: number, day: number) {
  if (year < -61 || year > 3177) return null;
  if (!isValidJalaaliDate(year, month, day)) return null;
  const gregorianDate = toGregorian(year, month, day);
  const gregorianMonth = String(gregorianDate.gm).padStart(2, '0');
  const gregorianDay = String(gregorianDate.gd).padStart(2, '0');
  return `${gregorianDate.gy}-${gregorianMonth}-${gregorianDay}`;
}

export function formatJalaliDate(value: string) {
  const date = getJalaliDate(value);
  if (!date) return '';

  return `${toPersianDigits(date.day)} ${jalaliMonthNames[date.month - 1]} ${toPersianDigits(date.year)}`;
}
