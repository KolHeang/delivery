import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MinioService } from '../../minio/minio.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { createMulterOptions } from '../../config/multer';

@ApiTags('Mobile Upload')
@Controller('mobile/upload')
export class UploadController {
  constructor(private readonly minioService: MinioService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload single image/file for mobile app (proof, signature, chat, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Target folder (e.g., proofs, signatures, chat, profile)',
    example: 'proofs',
  })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createMulterOptions({
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
          'image/gif',
          'application/pdf',
        ],
        maxFileSize: 10 * 1024 * 1024, // 10MB
      }),
    ),
  )
  async uploadSingle(
    @UploadedFile() file: any,
    @Query('folder') folder: string = 'mobile',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'mobile';
    const url = await this.minioService.uploadFile(file, cleanFolder);
    return {
      success: true,
      url,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple images/files for mobile app (e.g. proofPhotos)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    description: 'Target folder',
    example: 'proofs',
  })
  @UseInterceptors(
    FilesInterceptor(
      'files',
      10,
      createMulterOptions({
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/jpg',
          'image/gif',
          'application/pdf',
        ],
        maxFileSize: 10 * 1024 * 1024,
      }),
    ),
  )
  async uploadMultiple(
    @UploadedFiles() files: any[],
    @Query('folder') folder: string = 'mobile',
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'mobile';
    const uploadPromises = files.map((f) =>
      this.minioService.uploadFile(f, cleanFolder),
    );
    const urls = await Promise.all(uploadPromises);
    return {
      success: true,
      urls,
      count: urls.length,
    };
  }
}
