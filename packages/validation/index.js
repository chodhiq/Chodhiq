const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanText(value, { field = 'Value', min = 0, max = 500, multiline = false } = {}) {
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  const normalized = value.normalize('NFKC').replace(CONTROL_CHARS, '').trim();
  const cleaned = multiline ? normalized.replace(/\r\n?/g, '\n') : normalized.replace(/\s+/g, ' ');
  if (cleaned.length < min) throw new Error(`${field} must be at least ${min} characters.`);
  if (cleaned.length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
  return cleaned;
}
export function cleanEmail(value) {
  const email = cleanText(value, { field: 'Email', min: 3, max: 254 }).toLowerCase();
  if (!EMAIL.test(email)) throw new Error('Enter a valid email address.');
  return email;
}
export function cleanPassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128)
    throw new Error('Password must be between 10 and 128 characters.');
  return value;
}
export function requireUuid(value, field = 'Identifier') {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`${field} is invalid.`);
  return value;
}
export function validateHttpsUrl(value, field = 'Website') {
  const text = cleanText(value, { field, max: 300 });
  if (!text) return '';
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname)
    throw new Error(`${field} must be a valid HTTPS URL.`);
  return url.toString();
}
export function validateText(value, label, min, max) {
  try {
    cleanText(value, { field: label, min, max, multiline: true });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : `${label} is invalid.`;
  }
}
export function validateService(name, price) {
  const error = validateText(name, 'Service name', 2, 120);
  if (error) return error;
  if (!String(price).trim()) return null;
  const amount = Number(price);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000
    ? null
    : 'Enter a valid non-negative price.';
}
export function validateUpload(file, allowedTypes, maxBytes = 10 * 1024 * 1024) {
  if (!allowedTypes.includes(file.type)) return 'Choose a supported file type.';
  if (file.size <= 0 || file.size > maxBytes)
    return `File must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return null;
}
export function validateOptionalUrl(value) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? null
      : 'Website must use HTTP or HTTPS.';
  } catch {
    return 'Enter a valid website URL.';
  }
}
