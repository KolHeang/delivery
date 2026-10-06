import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateFirebaseCredentialDto {
  @ApiProperty({ required: false, default: 'service_account' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: true })
  @IsString()
  projectId: string;

  @ApiProperty({ required: true })
  @IsString()
  privateKeyId: string;

  @ApiProperty({ required: true })
  @IsString()
  privateKey: string;

  @ApiProperty({ required: true })
  @IsString()
  clientEmail: string;

  @ApiProperty({ required: true })
  @IsString()
  clientId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authUri?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tokenUri?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authProviderX509CertUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientX509CertUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  universeDomain?: string;
}

export class UpdateFirebaseCredentialDto extends PartialType(CreateFirebaseCredentialDto) {}
