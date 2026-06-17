import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from './merchant.entity';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { MinioModule } from '../minio/minio.mudule';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant]), MinioModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}

