export type TextOptions = { field?: string; min?: number; max?: number; multiline?: boolean };
export type UploadLike = { size: number; type: string };
export declare function cleanText(value: unknown, options?: TextOptions): string;
export declare function cleanEmail(value: unknown): string;
export declare function cleanPassword(value: unknown): string;
export declare function requireUuid(value: unknown, field?: string): string;
export declare function validateHttpsUrl(value: unknown, field?: string): string;
export declare function validateText(
  value: string,
  label: string,
  min: number,
  max: number,
): string | null;
export declare function validateService(name: string, price: string): string | null;
export declare function validateUpload(
  file: UploadLike,
  allowedTypes: readonly string[],
  maxBytes?: number,
): string | null;
export declare function validateOptionalUrl(value: string): string | null;
