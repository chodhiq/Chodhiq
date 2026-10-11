export function normalizeUkPhone(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const compact = raw.replace(/[\s().-]/g, '');
  const international = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  if (/^\+44[1-9]\d{9}$/.test(international)) return international;
  if (/^0[1-9]\d{9}$/.test(international)) return `+44${international.slice(1)}`;
  return null;
}
