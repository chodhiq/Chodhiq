// @ts-check

/**
 * @param {string} requestedDate
 * @param {string} requestedTime
 * @param {Date} [now]
 * @returns {{ date: string, time: string }}
 */
export function validateBookingDateTime(requestedDate, requestedTime, now = new Date()) {
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
  return { date, time };
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
