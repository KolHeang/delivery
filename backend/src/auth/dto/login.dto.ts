import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@gmail.com' })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'e-express', description: 'Tenant workspace subdomain' })
  @IsOptional()
  @IsString()
  subdomain?: string;

  @ApiPropertyOptional({ example: 'e-express.ebsexpress.com', description: 'Tenant domain or host' })
  @IsOptional()
  @IsString()
  domain?: string;
}

