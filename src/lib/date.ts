export function formatPocketBaseDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  if (typeof value !== 'string' || value.length === 0) return '—';

  const normalized = value
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:)/, '$1T$2')
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const date = new Date(normalized);

  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fa-IR', options).format(date);
}
