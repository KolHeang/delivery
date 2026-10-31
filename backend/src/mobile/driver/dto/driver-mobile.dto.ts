import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';

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

export class BatchScanParcelsDto {
  @ApiProperty({
    example: ['PKG1001', 'PKG1002', 'PKG1003'],
    type: [String],
    description: 'Array of parcel tracking codes or QR contents to scan',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  codes: string[];
}

export class BatchClaimParcelsDto {
  @ApiProperty({
    example: ['PKG1001', 'PKG1002'],
    type: [String],
    description: 'Array of parcel tracking codes to claim',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  codes: string[];
}

export class BatchUpdateParcelStatusDto {
  @ApiProperty({
    example: ['PKG1001', 'PKG1002'],
    type: [String],
    description: 'Array of parcel tracking codes to update',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  codes: string[];

  @ApiProperty({
    example: 'in-transit',
    enum: ['picked-up', 'in-transit', 'in-warehouse', 'delivered', 'failed', 'returned'],
    description: 'Target delivery status for all parcels',
  })
  @IsNotEmpty()
  @IsEnum(['picked-up', 'in-transit', 'in-warehouse', 'delivered', 'failed', 'returned'])
  status: string;

  @ApiProperty({ example: 'Departed hub', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: 'Remarks', required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ example: 'Reason', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class DriverSettlementFilterDto {
  @ApiProperty({
    example: 'all',
    required: false,
    enum: ['all', 'paid', 'pending', 'problem'],
    description: 'Filter settlements by status: all, paid, pending, problem',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'today', required: false, enum: ['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'], description: 'Preset period filter' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiProperty({ example: '2026-10-15', required: false, description: 'Single date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ example: '2026-10-01', required: false, description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ example: '2026-10-31', required: false, description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ example: '2026-10-01_2026-10-31', required: false, description: 'Date range string (YYYY-MM-DD to YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateRange?: string;

  @ApiProperty({ example: '2026-10', required: false, description: 'Month filter in YYYY-MM format' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiProperty({ example: 'all', required: false, enum: ['all', 'USD', 'KHR'], description: 'Currency filter: all, USD, KHR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'ST8002', required: false, description: 'Search by reference or note' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 1, required: false, description: 'Page number (1-based)' })
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 20, required: false, description: 'Items per page' })
  @IsOptional()
  limit?: number;
}

export class CreateDriverSettlementRequestDto {
  @ApiProperty({ example: [101, 102], required: false, type: [Number], description: 'Parcels to settle' })
  @IsOptional()
  @IsArray()
  parcelIds?: number[];

  @ApiProperty({ example: 77000, required: false, description: 'Total settlement amount' })
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 'KHR', required: false, default: 'KHR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Daily cash handover settlement request', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReportSettlementProblemDto {
  @ApiProperty({ example: 'Cash mismatch: order COD received was 75,000 KHR instead of 77,000 KHR', description: 'Problem explanation' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({ example: 'Additional remarks on the discrepancy', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

