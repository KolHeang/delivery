import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';
import { createMinioClient } from 'src/config/minio';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'MINIO_CLIENT',
            useFactory: (configService: ConfigService) => createMinioClient(configService),
            inject: [ConfigService],
        },
        MinioService,
    ],
    exports: [MinioService],
})
export class MinioModule { }