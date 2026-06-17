import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/merchant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from '../config/multer';
import { MinioService } from '../minio/minio.service';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly minioService: MinioService,
  ) {}

  @Get() findAll() {
    return this.merchantsService.findAll();
  }
  
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findOne(id);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'qrImageKhr', maxCount: 1 },
      { name: 'qrImageUsd', maxCount: 1 },
    ], createMulterOptions({
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024
    }))
  )
  @ApiConsumes('multipart/form-data')
  async create(
    @Body() dto: CreateMerchantDto,
    @UploadedFiles() files: { photo?: any[], qrImageKhr?: any[], qrImageUsd?: any[] }
  ) {
    if (files?.photo?.[0]) {
      dto.photo = await this.minioService.uploadFile(files.photo[0], 'merchants');
    }
    if (files?.qrImageKhr?.[0]) {
      dto.qrImageKhr = await this.minioService.uploadFile(files.qrImageKhr[0], 'merchants');
    }
    if (files?.qrImageUsd?.[0]) {
      dto.qrImageUsd = await this.minioService.uploadFile(files.qrImageUsd[0], 'merchants');
    }
    return this.merchantsService.create(dto);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'qrImageKhr', maxCount: 1 },
      { name: 'qrImageUsd', maxCount: 1 },
    ], createMulterOptions({
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024
    }))
  )
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantDto,
    @UploadedFiles() files: { photo?: any[], qrImageKhr?: any[], qrImageUsd?: any[] }
  ) {
    if (files?.photo?.[0]) {
      dto.photo = await this.minioService.uploadFile(files.photo[0], 'merchants');
    }
    if (files?.qrImageKhr?.[0]) {
      dto.qrImageKhr = await this.minioService.uploadFile(files.qrImageKhr[0], 'merchants');
    }
    if (files?.qrImageUsd?.[0]) {
      dto.qrImageUsd = await this.minioService.uploadFile(files.qrImageUsd[0], 'merchants');
    }
    return this.merchantsService.update(id, dto);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.remove(id);
  }
}
