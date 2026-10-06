import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class LocationUpdateDto {
  @ApiProperty({ example: '1', description: 'Driver ID' })
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @ApiPropertyOptional({ example: 'ORD-12345', description: 'Associated Order/Parcel ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ example: 11.5564, description: 'Latitude coordinate' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 11.5564, description: 'Alias for latitude' })
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 104.9282, description: 'Longitude coordinate' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 104.9282, description: 'Alias for longitude' })
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 90, description: 'Heading 0-360 degrees' })
  @IsNumber()
  @IsOptional()
  heading?: number;

  @ApiPropertyOptional({ example: 25.5, description: 'Speed in km/h' })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 10, description: 'GPS accuracy in meters' })
  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @ApiPropertyOptional({ example: 85, description: 'Device battery percentage' })
  @IsNumber()
  @IsOptional()
  battery?: number;

  @ApiPropertyOptional({ example: true, description: 'Is driver online and active' })
  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @ApiPropertyOptional({ example: ['PARCEL-001'], description: 'List of active parcel tracking codes' })
  @IsArray()
  @IsOptional()
  activeParcelCodes?: string[];

  @ApiPropertyOptional({ example: 1, description: 'Tenant ID' })
  @IsNumber()
  @IsOptional()
  tenantId?: number;
}
