import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export function createMulterOptions(options: {
  allowedMimeTypes: string[];
  maxFileSize: number;
}): MulterOptions {
  return {
    limits: {
      fileSize: options.maxFileSize,
    },
    fileFilter: (req: any, file: any, cb: any) => {
      if (options.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      }
    },
  };
}
