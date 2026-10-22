import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddDomainDto {
  @ApiProperty({ description: 'Tenant ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  tenantId: number;

  @ApiProperty({ description: 'Domain name (e.g. delivery.mybrand.com)', example: 'delivery.mybrand.com' })
  @IsNotEmpty()
  @IsString()
  domain: string;

  @ApiPropertyOptional({ description: 'Whether this domain is primary for the tenant', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Domain type (e.g. custom or subdomain)', example: 'custom' })
  @IsOptional()
  @IsString()
  domainType?: string;

  @ApiPropertyOptional({ description: 'DNS target CNAME', example: 'cname.mysaas.com' })
  @IsOptional()
  @IsString()
  dnsTarget?: string;
}
