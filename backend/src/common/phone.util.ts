import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const MAX_PHONE_DIGITS = 10;
export const PHONE_MAX_DIGITS_MESSAGE =
  'លេខទូរស័ព្ទមិនអាចលើសពី ១០ ខ្ទង់បានទេ (Phone number must not exceed 10 digits)';

/**
 * Counts numeric digits in a phone string (converting Khmer numerals ០-៩ to 0-9 first).
 */
export function countPhoneDigits(value: string): number {
  const normalized = value.replace(/[\u17E0-\u17E9]/g, (ch) =>
    String(ch.charCodeAt(0) - 0x17e0),
  );
  return normalized.replace(/\D/g, '').length;
}

/**
 * Returns true if the phone string contains at most `maxDigits` numeric digits.
 * Empty/null/undefined values return true so required/optional semantics stay on @IsNotEmpty/@IsOptional.
 */
export function isValidPhoneMaxDigits(
  value: unknown,
  maxDigits = MAX_PHONE_DIGITS,
): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  if (value.trim() === '') return true;
  return countPhoneDigits(value) <= maxDigits;
}

/**
 * Throws BadRequestException when a provided phone value exceeds `maxDigits` digits.
 */
export function assertValidPhoneMaxDigits(
  value: unknown,
  maxDigits = MAX_PHONE_DIGITS,
): void {
  if (value === undefined || value === null) return;
  if (typeof value === 'string' && value.trim() === '') return;
  if (!isValidPhoneMaxDigits(value, maxDigits)) {
    throw new BadRequestException(PHONE_MAX_DIGITS_MESSAGE);
  }
}

/**
 * class-validator decorator enforcing that a phone field contains at most `maxDigits` digits.
 */
export function MaxPhoneDigits(
  maxDigits = MAX_PHONE_DIGITS,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxPhoneDigits',
      target: object.constructor,
      propertyName,
      constraints: [maxDigits],
      options: {
        message: PHONE_MAX_DIGITS_MESSAGE,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const limit =
            typeof args.constraints?.[0] === 'number'
              ? args.constraints[0]
              : MAX_PHONE_DIGITS;
          return isValidPhoneMaxDigits(value, limit);
        },
        defaultMessage() {
          return PHONE_MAX_DIGITS_MESSAGE;
        },
      },
    });
  };
}

