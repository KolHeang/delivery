import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MAX_PHONE_DIGITS,
  PHONE_MAX_DIGITS_MESSAGE,
  countPhoneDigits,
  isValidPhoneMaxDigits,
  assertValidPhoneMaxDigits,
} from './phone.util';
import {
  CreateParcelDto,
  UpdateParcelDto,
  BatchCreateParcelsDto,
} from '../parcels/dto/parcel.dto';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../customers/dto/customer.dto';
import {
  CreateDriverDto,
  UpdateDriverDto,
} from '../drivers/dto/driver.dto';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
} from '../merchants/dto/merchant.dto';
import {
  CreateMerchantBranchDto,
  UpdateMerchantBranchDto,
} from '../merchants/dto/merchant-branch.dto';
import { CreateUserDto, UpdateUserDto } from '../users/dto/user.dto';
import {
  CreateSaasAdminDto,
  UpdateSaasAdminDto,
} from '../saas/admins/dto/saas-admin.dto';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
} from '../saas/partners/dto/partner.dto';
import { UpdateDriverProfileDto } from '../mobile/driver/dto/driver-mobile.dto';
import {
  UpdateMerchantProfileDto,
  UpdateParcelAddressDto,
} from '../mobile/merchant/dto/merchant-mobile.dto';

async function validateDto<T extends object>(
  cls: new () => T,
  payload: Record<string, any>,
) {
  const instance = plainToInstance(cls, payload);
  return validate(instance);
}

describe('phone.util', () => {
  it('counts ASCII, formatted, and Khmer digits accurately', () => {
    expect(MAX_PHONE_DIGITS).toBe(10);
    expect(countPhoneDigits('0123456789')).toBe(10);
    expect(countPhoneDigits('012 345 6789')).toBe(10);
    expect(countPhoneDigits('012-345-678')).toBe(9);
    expect(countPhoneDigits('045545241415')).toBe(12);
    expect(countPhoneDigits('០១២៣៤៥៦៧៨៩')).toBe(10);
    expect(countPhoneDigits('០១២៣៤៥៦៧៨៩០')).toBe(11);
    expect(countPhoneDigits('+855 78 000 000')).toBe(11);
  });

  it('validates max 10 digits while allowing empty/optional values', () => {
    expect(isValidPhoneMaxDigits('012345678')).toBe(true);
    expect(isValidPhoneMaxDigits('0123456789')).toBe(true);
    expect(isValidPhoneMaxDigits('012 345 6789')).toBe(true);
    expect(isValidPhoneMaxDigits('០១២-៣៤៥-៦៧៨៩')).toBe(true);
    expect(isValidPhoneMaxDigits(undefined)).toBe(true);
    expect(isValidPhoneMaxDigits(null)).toBe(true);
    expect(isValidPhoneMaxDigits('')).toBe(true);
    expect(isValidPhoneMaxDigits('   ')).toBe(true);

    expect(isValidPhoneMaxDigits('01234567890')).toBe(false);
    expect(isValidPhoneMaxDigits('045545241415')).toBe(false);
    expect(isValidPhoneMaxDigits('០១២៣៤៥៦៧៨៩០')).toBe(false);
    expect(isValidPhoneMaxDigits(12345678901)).toBe(false);
  });

  it('assertValidPhoneMaxDigits throws BadRequestException when > 10 digits', () => {
    expect(() => assertValidPhoneMaxDigits(undefined)).not.toThrow();
    expect(() => assertValidPhoneMaxDigits(null)).not.toThrow();
    expect(() => assertValidPhoneMaxDigits('')).not.toThrow();
    expect(() => assertValidPhoneMaxDigits('0123456789')).not.toThrow();
    expect(() => assertValidPhoneMaxDigits('០១២៣៤៥៦៧៨៩')).not.toThrow();

    expect(() => assertValidPhoneMaxDigits('01234567890')).toThrow(
      BadRequestException,
    );
    expect(() => assertValidPhoneMaxDigits('045545241415')).toThrow(
      PHONE_MAX_DIGITS_MESSAGE,
    );
    expect(() => assertValidPhoneMaxDigits('០១២៣៤៥៦៧៨៩០')).toThrow(
      BadRequestException,
    );
  });
});

describe('@MaxPhoneDigits() DTO validation', () => {
  it('validates CreateParcelDto & UpdateParcelDto receiverPhone', async () => {
    const valid = await validateDto(CreateParcelDto, {
      receiverPhone: '0123456789',
      receiverAddress: 'Phnom Penh',
    });
    expect(valid).toHaveLength(0);

    const validFormatted = await validateDto(CreateParcelDto, {
      receiverPhone: '012 345 6789',
      receiverAddress: 'Phnom Penh',
    });
    expect(validFormatted).toHaveLength(0);

    const invalid12 = await validateDto(CreateParcelDto, {
      receiverPhone: '045545241415',
      receiverAddress: 'Phnom Penh',
    });
    expect(invalid12.some((e) => e.property === 'receiverPhone')).toBe(true);

    const updateOmitted = await validateDto(UpdateParcelDto, {
      receiverAddress: 'Updated Address',
    });
    expect(updateOmitted).toHaveLength(0);

    const updateInvalid = await validateDto(UpdateParcelDto, {
      receiverPhone: '01234567890',
    });
    expect(updateInvalid.some((e) => e.property === 'receiverPhone')).toBe(
      true,
    );
  });

  it('validates nested items in BatchCreateParcelsDto', async () => {
    const validBatch = await validateDto(BatchCreateParcelsDto, {
      items: [
        { receiverPhone: '012345678', receiverAddress: 'Addr 1' },
        { receiverPhone: '0987654321', receiverAddress: 'Addr 2' },
      ],
    });
    expect(validBatch).toHaveLength(0);

    const invalidBatch = await validateDto(BatchCreateParcelsDto, {
      items: [
        { receiverPhone: '012345678', receiverAddress: 'Addr 1' },
        { receiverPhone: '01234567890', receiverAddress: 'Addr 2' },
      ],
    });
    expect(invalidBatch.length).toBeGreaterThan(0);
    expect(invalidBatch[0].property).toBe('items');
  });

  it('validates Customer, Driver, Merchant, and MerchantBranch DTOs', async () => {
    expect(
      await validateDto(CreateCustomerDto, {
        name: 'Sok',
        phone: '0123456789',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreateCustomerDto, {
          name: 'Sok',
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdateCustomerDto, {
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(CreateDriverDto, {
        name: 'Driver A',
        phone: '0987654321',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreateDriverDto, {
          name: 'Driver A',
          phone: '09876543210',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdateDriverDto, {
          phone: '09876543210',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(CreateMerchantDto, {
        name: 'Shop A',
        phone: '0123456789',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreateMerchantDto, {
          name: 'Shop A',
          phone: '012345678901',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdateMerchantDto, {
          phone: '012345678901',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(CreateMerchantBranchDto, {
        name: 'Branch TK',
        phone: '0123456789',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreateMerchantBranchDto, {
          name: 'Branch TK',
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdateMerchantBranchDto, {
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
  });

  it('validates User, SaasAdmin, Partner, and Mobile DTOs', async () => {
    expect(
      await validateDto(CreateUserDto, {
        name: 'Staff 1',
        phone: '0123456789',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreateUserDto, {
          name: 'Staff 1',
          phone: '០១២៣៤៥៦៧៨៩០',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdateUserDto, {
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(CreateSaasAdminDto, {
        name: 'Admin',
        email: 'admin@example.com',
        password: 'Password123',
        phone: '0123456789',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreateSaasAdminDto, {
          name: 'Admin',
          email: 'admin@example.com',
          password: 'Password123',
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdateSaasAdminDto, {
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(CreatePartnerDto, {
        name: 'Partner',
        email: 'partner@example.com',
        phone: '0123456789',
      }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(CreatePartnerDto, {
          name: 'Partner',
          email: 'partner@example.com',
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);
    expect(
      (
        await validateDto(UpdatePartnerDto, {
          phone: '01234567890',
        })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(UpdateDriverProfileDto, { phone: '0123456789' }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(UpdateDriverProfileDto, { phone: '01234567890' })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(UpdateMerchantProfileDto, { phone: '0123456789' }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(UpdateMerchantProfileDto, { phone: '01234567890' })
      ).some((e) => e.property === 'phone'),
    ).toBe(true);

    expect(
      await validateDto(UpdateParcelAddressDto, { receiverPhone: '0123456789' }),
    ).toHaveLength(0);
    expect(
      (
        await validateDto(UpdateParcelAddressDto, {
          receiverPhone: '01234567890',
        })
      ).some((e) => e.property === 'receiverPhone'),
    ).toBe(true);
  });
});

