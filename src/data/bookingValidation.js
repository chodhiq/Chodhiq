// @ts-check

/**
 * @param {string} requestedDate
 * @param {string} requestedTime
 * @param {Date} [now]
 * @param {Array<{day_of_week?: number | string, open_time?: string | null, close_time?: string | null, is_closed?: boolean | null}>} [openingHours]
 * @returns {{ date: string, time: string }}
 */
export function validateBookingDateTime(
  requestedDate,
  requestedTime,
  now = new Date(),
  openingHours,
) {
  const date = String(requestedDate || '').trim();
  const time = String(requestedTime || '').trim();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateMatch) throw new Error('Choose a date using the calendar.');

  const [, yearText, monthText, dayText] = dateMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const [hours, minutes] = time.split(':').map(Number);
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error('Choose a valid booking time.');
  }
  const requested = new Date(Date.UTC(year, month - 1, day));
  if (
    requested.getUTCFullYear() !== year ||
    requested.getUTCMonth() !== month - 1 ||
    requested.getUTCDate() !== day
  ) {
    throw new Error('Choose a valid booking date.');
  }
  const current = getUkLocalDateTime(now);
  if (`${date}T${time}` <= `${current.date}T${current.time}`) {
    throw new Error('Choose a future date and time.');
  }
  if (Array.isArray(openingHours) && openingHours.length > 0) {
    const requestedDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const requestedMinutes = hours * 60 + minutes;
    const previousDay = (requestedDay + 6) % 7;
    /**
     * @param {{day_of_week?: number | string, open_time?: string | null, close_time?: string | null, is_closed?: boolean | null}} slot
     * @param {number} day
     * @param {number} timeMinutes
     */
    const coversTime = (slot, day, timeMinutes) => {
      if (Number(slot.day_of_week) !== day || slot.is_closed) return false;
      const open = parseOpeningTime(slot.open_time);
      const close = parseOpeningTime(slot.close_time);
      if (open === null || close === null || open === close) return false;
      return open < close ? timeMinutes >= open && timeMinutes < close : timeMinutes >= open;
    };
    const isOpen =
      openingHours.some((slot) => coversTime(slot, requestedDay, requestedMinutes)) ||
      openingHours.some((slot) => {
        const open = parseOpeningTime(slot.open_time);
        const close = parseOpeningTime(slot.close_time);
        return (
          Number(slot.day_of_week) === previousDay &&
          !slot.is_closed &&
          open !== null &&
          close !== null &&
          open > close &&
          requestedMinutes < close
        );
      });
    if (!isOpen) throw new Error('Choose a time within the business’s opening hours.');
  }
  return { date, time };
}

/**
 * @param {string} requestedTime
 * @param {Array<unknown> | null | undefined} openingHours
 */
export function requiresLateNightBookingConfirmation(requestedTime, openingHours) {
  if (Array.isArray(openingHours) && openingHours.length > 0) return false;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(requestedTime || ''));
  if (!match) return false;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 22 * 60 || minutes < 7 * 60;
}

/** @param {number} days @param {Date} [now] */
export function getUkFutureDate(days, now = new Date()) {
  const { date } = getUkLocalDateTime(now);
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`;
}

/** @param {string | null | undefined} value */
function parseOpeningTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(value || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** @param {Date} [now] */
export function getUkLocalDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  /** @param {string} type */
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}
