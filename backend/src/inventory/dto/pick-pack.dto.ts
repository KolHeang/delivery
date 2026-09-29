import { IsNotEmpty, IsNumber, IsOptional, IsString, IsIn } from 'class-validator';

export class ScanBarcodeDto {
  @IsNotEmpty()
  @IsNumber()
  parcelId: number;

  @IsNotEmpty()
  @IsString()
  barcode: string;
}

export class RestockParcelDto {
  @IsNotEmpty()
  @IsIn(['RESTOCK', 'DAMAGED'])
  action: 'RESTOCK' | 'DAMAGED';

  @IsOptional()
  @IsString()
  note?: string;
}
