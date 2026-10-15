import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateMerchantProfileDto {
  @ApiProperty({ example: 'Phnom Penh Fashion Store', required: false, description: 'Store or merchant name in English' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '012345678', required: false, description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'shop@store.com', required: false, description: 'Contact email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/merchant_logo.png', required: false, description: 'Shop logo or profile photo URL' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: 'Building #45, Street 271, Boeng Tumpun, Phnom Penh', required: false, description: 'Shop pickup location address' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class ChangeMerchantPasswordDto {
  @ApiProperty({ example: '123456', description: 'Current merchant account password' })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'NewPass@2026', description: 'New password (min 6 characters)' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

export class CancelParcelDto {
  @ApiProperty({ example: 'Customer cancelled the order before shipment', required: false, description: 'Reason for cancelling the parcel' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateParcelAddressDto {
  @ApiProperty({ example: 'House #12B, St 1986, Sen Sok, Phnom Penh', required: false, description: 'New receiver address' })
  @IsOptional()
  @IsString()
  receiverAddress?: string;

  @ApiProperty({ example: '098765432', required: false, description: 'New receiver phone number' })
  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @ApiProperty({ example: 'Srey Mao', required: false, description: 'New receiver contact name' })
  @IsOptional()
  @IsString()
  receiverName?: string;
}

export class UpdateParcelNoteDto {
  @ApiProperty({ example: 'Fragile: handle with care. Deliver between 2PM - 4PM.', description: 'Special delivery instruction or note' })
  @IsNotEmpty()
  @IsString()
  note: string;
}

export class SpeedUpParcelDto {
  @ApiProperty({ example: 'Customer requested rush delivery for evening event', required: false, description: 'Reason for speeding up delivery' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SendMerchantMessageDto {
  @ApiProperty({ example: 'Please make sure to call before handing over the item', description: 'Message sent to rider' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/chat/item_preview.jpg', required: false, description: 'Optional photo URL' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
