export type UploadLike = { size: number; type: string };

export function validateText(value: string, label: string, min: number, max: number): string | null {
  // eslint-disable-next-line no-control-regex -- strip non-printing input before validation
  const normalized = value.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (normalized.length < min) return `${label} must be at least ${min} characters.`;
  if (normalized.length > max) return `${label} must be ${max} characters or fewer.`;
  return null;
}

export function validateService(name: string, price: string): string | null {
  const error = validateText(name, 'Service name', 2, 120);
  if (error) return error;
  if (!String(price).trim()) return null;
  const amount = Number(price);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000
    ? null
    : 'Enter a valid non-negative price.';
}

export function validateUpload(
  file: UploadLike,
  allowedTypes: readonly string[],
  maxBytes = 10 * 1024 * 1024,
): string | null {
  if (!allowedTypes.includes(file.type)) return 'Choose a supported file type.';
  if (file.size <= 0 || file.size > maxBytes)
    return `File must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return null;
}

export function validateOptionalUrl(value: string): string | null {
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
