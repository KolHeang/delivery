import { ConfigService } from '@nestjs/config';

const DEV_FALLBACK_SECRET = 'delivery_jwt_secret_2024_!@#$';

export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: JWT_SECRET environment variable must be set in production.',
    );
  }
  return DEV_FALLBACK_SECRET;
}
