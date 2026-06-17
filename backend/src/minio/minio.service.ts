import { Injectable, Inject, Logger } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject('MINIO_CLIENT') private readonly minioClient: Minio.Client,
  ) {}

  getClient(): Minio.Client {
    return this.minioClient;
  }

  async uploadFile(file: any, folder: string): Promise<string> {
    const bucket = process.env.MINIO_BUCKET || 'delivery';
    
    try {
      // Ensure bucket exists
      const exists = await this.minioClient.bucketExists(bucket);
      if (!exists) {
        await this.minioClient.makeBucket(bucket, process.env.MINIO_REGION || 'us-east-1');
        // Set public read policy on the bucket
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        };
        await this.minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
      }

      const ext = file.originalname.split('.').pop() || '';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const key = folder ? `${folder}/${filename}` : filename;

      await this.minioClient.putObject(
        bucket,
        key,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype }
      );

      const externalUrl = process.env.MINIO_EXTERNAL_URL || `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}`;
      return `${externalUrl}/${bucket}/${key}`;
    } catch (error) {
      this.logger.error('Failed to upload file to Minio', error);
      throw error;
    }
  }
}