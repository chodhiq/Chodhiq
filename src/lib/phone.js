/** Normalize a phone number for WhatsApp's digits-only wa.me URL. */
export function toWhatsAppNumber(raw, defaultCountryCode = '44') {
  if (raw == null || !String(raw).trim()) return null;
  const value = String(raw).trim();
  let digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `${defaultCountryCode}${digits.slice(1)}`;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}
