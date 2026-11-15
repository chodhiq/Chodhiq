// @ts-check

const DEFAULT_LOCALE = 'en-GB';
const UK_TIME_ZONE = 'Europe/London';
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** @param {string | Date | null | undefined} value */
function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !value) return null;
  const dateOnly = DATE_PATTERN.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    )
      return null;
    return parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * @param {string | Date | null | undefined} value
 * @param {string} [locale]
 */
export function formatDate(value, locale = DEFAULT_LOCALE) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: UK_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * @param {string | Date | null | undefined} value
 * @param {string} [locale]
 */
export function formatDateTime(value, locale = DEFAULT_LOCALE) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: UK_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).format(date);
}

/**
 * @param {string | Date | null | undefined} value
 * @param {string} [locale]
 */
export function formatYear(value, locale = DEFAULT_LOCALE) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a UK wall-clock booking date/time without converting it through the device timezone.
 * @param {string | null | undefined} dateValue
 * @param {string | null | undefined} timeValue
 * @param {string} [locale]
 */
export function formatBookingDateTime(dateValue, timeValue, locale = DEFAULT_LOCALE) {
  const dateMatch = DATE_PATTERN.exec(String(dateValue || ''));
  const timeMatch = TIME_PATTERN.exec(String(timeValue || ''));
  if (!dateMatch || !timeMatch) return '';
  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).format(date);
}

/**
 * @param {string | null | undefined} value
 * @param {string} [locale]
 */
export function formatBookingTime(value, locale = DEFAULT_LOCALE) {
  const match = TIME_PATTERN.exec(String(value || ''));
  if (!match) return '';
  const [, hour, minute] = match.map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));
}
