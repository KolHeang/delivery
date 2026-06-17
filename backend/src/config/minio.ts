import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export const createMinioClient = (configService: ConfigService) => {
    const endPoint = configService.get<string>('MINIO_ENDPOINT') || 'localhost';
    const useSSL = configService.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = configService.get<string>('MINIO_ACCESS_KEY') || 'admin';
    const secretKey = configService.get<string>('MINIO_SECRET_KEY') || 'admin123';

    // Read the port, but don't default to 9000 if using standard web ports
    const rawPort = configService.get<string>('MINIO_PORT');
    const port = rawPort ? Number(rawPort) : undefined;

    return new Minio.Client({
        endPoint,
        ...(port && { port }), // Only pass the port to the SDK if it's explicitly defined
        useSSL,
        accessKey,
        secretKey,
    });
};