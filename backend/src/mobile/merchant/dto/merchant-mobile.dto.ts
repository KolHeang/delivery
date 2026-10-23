import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

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

export class CreateMerchantBranchDto {
  @ApiProperty({ example: 'សាខាទួលគោក (Tuol Kork Branch)', description: 'Branch or location name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'TK-01', required: false, description: 'Optional branch code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ example: 'Chan Vanna', required: false, description: 'Branch contact person name' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ example: '012345678', required: false, description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Street 271, Sangkat Boeng Tumpun, Khan Mean Chey, Phnom Penh', required: false, description: 'Full address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 1, required: false, description: 'Delivery Zone ID' })
  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @ApiProperty({ example: 11.5448729, required: false, description: 'GPS Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 104.8921668, required: false, description: 'GPS Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: false, required: false, description: 'Set as default pickup location' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ example: 'Next to ABA Bank ATM', required: false, description: 'Landmark or note' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMerchantBranchDto extends PartialType(CreateMerchantBranchDto) {}

export class CreateMerchantContactDto {
  @ApiProperty({ example: 'Sok San', description: 'Receiver / customer name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '098765432', description: 'Contact phone number' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'House #15, Street 2004, Phnom Penh', required: false, description: 'Delivery address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'customer@gmail.com', required: false, description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class SendSupportMessageDto {
  @ApiProperty({ example: 'Hello Support, I need help with my pickup schedule', description: 'Support inquiry message' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/chat/issue.jpg', required: false, description: 'Optional screenshot or photo' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
