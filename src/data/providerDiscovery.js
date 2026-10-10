// @ts-check

/** @param {unknown} value */
export function normalizePostcode(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** @param {unknown} postcode @param {unknown} query */
export function matchesPostcodePrefix(postcode, query) {
  const normalizedPostcode = normalizePostcode(postcode);
  const normalizedQuery = normalizePostcode(query);
  if (!normalizedQuery) return true;
  if (!normalizedPostcode.startsWith(normalizedQuery)) return false;

  // A complete outward code such as LE1 is a boundary. This keeps LE10 and LE11
  // out, while a spaced query such as "LE1 1" can continue into the inward code.
  const rawQuery = String(query || '').trim();
  if (/\s/.test(rawQuery)) return true;
  if (!/^[a-z]{1,2}\d\d?[a-z]?$/.test(normalizedQuery)) return true;
  const match = /^([a-z]{1,2}\d\d?[a-z]?)[0-9][a-z]{2}$/.exec(normalizedPostcode);
  return match?.[1] === normalizedQuery;
}

/**
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} targetLatitude
 * @param {number} targetLongitude
 */
export function distanceKm(latitude, longitude, targetLatitude, targetLongitude) {
  /** @param {number} degrees */
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(targetLatitude - latitude);
  const longitudeDelta = radians(targetLongitude - longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitude)) *
      Math.cos(radians(targetLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

/** @param {{day_of_week?: number, is_closed?: boolean, open_time?: string, close_time?: string}[]} hours */
export function isProviderOpenNow(hours = [], now = new Date()) {
  if (!hours.length) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  /** @type {Record<string, number>} */
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = weekdays[weekday || ''];
  const today = hours.find((item) => Number(item.day_of_week) === dayOfWeek);
  if (!today) return null;
  if (today.is_closed) return false;
  if (!today.open_time || !today.close_time) return null;
  const nowMinutes = hour * 60 + minute;
  /** @param {string} time */
  const toMinutes = (time) => {
    const match = /^(\d{2}):(\d{2})/.exec(time);
    if (!match) return null;
    const value = Number(match[1]) * 60 + Number(match[2]);
    return value <= 1439 ? value : null;
  };
  const opens = toMinutes(today.open_time);
  const closes = toMinutes(today.close_time);
  if (opens === null || closes === null) return null;
  return closes < opens
    ? nowMinutes >= opens || nowMinutes < closes
    : nowMinutes >= opens && nowMinutes < closes;
}
