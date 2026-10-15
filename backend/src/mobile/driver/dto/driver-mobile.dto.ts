import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class UpdateDriverProfileDto {
  @ApiProperty({ example: 'Sok Dara', required: false, description: 'Full name in English' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'សុខ តារា', required: false, description: 'Full name in Khmer' })
  @IsOptional()
  @IsString()
  nameKh?: string;

  @ApiProperty({ example: '012345678', required: false, description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'driver@delivery.com', required: false, description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/driver_avatar.jpg', required: false, description: 'Profile photo URL' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: 'male', required: false, enum: ['male', 'female', 'other'], description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: '1995-05-12', required: false, description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiProperty({ example: '2023-01-15', required: false, description: 'Employment start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  joinDate?: string;
}

export class ChangeDriverPasswordDto {
  @ApiProperty({ example: '123456', description: 'Current driver account password' })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'NewPass@2026', description: 'New password (min 6 characters)' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

export class UpdateDriverStatusDto {
  @ApiProperty({ example: 'available', enum: ['available', 'offline'], description: 'Online status for receiving deliveries' })
  @IsNotEmpty()
  @IsString()
  status: string;
}

export class ScanParcelDto {
  @ApiProperty({ example: 'CO151020260001', description: 'Parcel tracking code or QR code content' })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class ScanUpdateParcelStatusDto {
  @ApiProperty({ example: 'CO151020260001', description: 'Parcel tracking code' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    example: 'delivered',
    enum: ['picked-up', 'in-transit', 'delivered', 'failed', 'returned'],
    description: 'Updated parcel delivery status',
  })
  @IsNotEmpty()
  @IsEnum(['picked-up', 'in-transit', 'delivered', 'failed', 'returned'])
  status: string;

  @ApiProperty({ example: 'Delivered directly to customer', required: false, description: 'Delivery note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: 'Paid with cash', required: false, description: 'Additional remarks' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ example: 'Customer not at home', required: false, description: 'Reason if failed or returned' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    example: ['https://api.example.com/uploads/proofs/proof1.jpg'],
    required: false,
    type: [String],
    description: 'Delivery proof photos',
  })
  @IsOptional()
  @IsArray()
  proofPhotos?: string[];

  @ApiProperty({
    example: 'https://api.example.com/uploads/signatures/sign1.png',
    required: false,
    description: 'Customer signature URL or base64',
  })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/failed/door_closed.jpg', required: false })
  @IsOptional()
  @IsString()
  failedPhoto?: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/return/item_back.jpg', required: false })
  @IsOptional()
  @IsString()
  returnPhoto?: string;

  @ApiProperty({ example: 'cash', required: false, enum: ['cash', 'aba', 'khr', 'usd'], description: 'COD payment method collected' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: 'paid', required: false, enum: ['paid', 'unpaid'], description: 'COD payment status' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;
}

export class SendDriverParcelMessageDto {
  @ApiProperty({ example: 'ខ្ញុំបានមកដល់មុខផ្ទះហើយបង (I have arrived at your delivery address)', description: 'Chat message content' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/chat/house_front.jpg', required: false, description: 'Optional photo URL' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
