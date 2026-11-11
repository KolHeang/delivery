export const MAX_PHONE_DIGITS = 10;

/**
 * Converts Khmer numerals (០-៩) to ASCII digits (0-9).
 */
export function normalizeKhmerDigits(value: string): string {
  return value.replace(/[\u17E0-\u17E9]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x17e0),
  );
}

/**
 * Counts numeric digits in a phone string.
 */
export function countPhoneDigits(value: string): number {
  return normalizeKhmerDigits(String(value ?? '')).replace(/\D/g, '').length;
}

/**
 * Keeps only numeric digits (capped at `maxDigits`) so typing or pasting cannot exceed 10 digits.
 */
export function sanitizePhoneInput(
  value: string,
  maxDigits = MAX_PHONE_DIGITS,
): string {
  return normalizeKhmerDigits(String(value ?? ''))
    .replace(/\D/g, '')
    .slice(0, maxDigits);
}

/**
 * Returns true when the phone string contains more than `maxDigits` numeric digits.
 */
export function isPhoneExceedingMaxDigits(
  value: string,
  maxDigits = MAX_PHONE_DIGITS,
): boolean {
  return countPhoneDigits(value) > maxDigits;
}

export function getPhoneMaxDigitsError(lang: string = 'km'): string {
  return lang === 'km'
    ? 'លេខទូរស័ព្ទមិនអាចលើសពី ១០ ខ្ទង់បានទេ'
    : 'Phone number must not exceed 10 digits';
}

