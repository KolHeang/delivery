import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { TenantDomain } from './saas/entities/tenant-domain.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Ensures Swagger UI works without blocking scripts
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Increase payload limit for base64 images (POD photos, signature)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS with dynamic wildcard subdomain & database-driven custom domain matching
  const baseDomain = (process.env.BASE_DOMAIN || 'e-express.com').replace(/^\./, '').toLowerCase();
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().toLowerCase())
    : [];

  // Cached set of verified custom domains from database
  let customDomainCache = new Set<string>();
  let lastCustomDomainCheck = 0;

  const isCustomDomainAllowed = async (host: string): Promise<boolean> => {
    try {
      const now = Date.now();
      // Cache for 60 seconds to avoid querying DB on every request
      if (now - lastCustomDomainCheck > 60000) {
        const dataSource = app.get(DataSource);
        if (dataSource && dataSource.isInitialized) {
          const domainRepo = dataSource.getRepository(TenantDomain);
          const verifiedRecords = await domainRepo.find({
            select: { domain: true },
            where: { isVerified: true },
          });
          customDomainCache = new Set(
            verifiedRecords.map((d) => d.domain.toLowerCase().trim()),
          );
          lastCustomDomainCheck = now;
        }
      }
      return customDomainCache.has(host);
    } catch {
      return false;
    }
  };

  app.enableCors({
    origin: async (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // 1. Allow mobile apps, curl, server-to-server (requests with no origin header)
      if (!origin) {
        return callback(null, true);
      }

      const lowerOrigin = origin.toLowerCase();

      // 2. In non-production, if CORS_ORIGIN is '*' or not set, allow all origins
      if (
        process.env.NODE_ENV !== 'production' ||
        configuredOrigins.includes('*') ||
        configuredOrigins.length === 0
      ) {
        return callback(null, true);
      }

      // 3. Exact match with any domain in configuredOrigins
      if (configuredOrigins.includes(lowerOrigin)) {
        return callback(null, true);
      }

      // 4. Match any tenant subdomain (*.yourdomain.com) of base domain or configured domains
      const rootsToCheck = [
        baseDomain,
        ...configuredOrigins.map((o) => o.replace(/^https?:\/\//, '').replace(/:\d+$/, '')),
      ];

      const isSubdomainMatch = rootsToCheck.some((root) => {
        if (!root || root === '*') return false;
        const cleanRoot = root.replace(/^\*\./, '').replace(/^\./, '');
        const escaped = cleanRoot.replace(/\./g, '\\.');
        const subRegex = new RegExp(`^https?:\\/\\/([a-zA-Z0-9-]+\\.)*${escaped}(:\\d+)?$`, 'i');
        return subRegex.test(lowerOrigin);
      });

      if (isSubdomainMatch) {
        return callback(null, true);
      }

      // 5. Allow local dev origins (localhost & 127.0.0.1)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(lowerOrigin)) {
        return callback(null, true);
      }

      // 6. Check database for verified Tenant Custom Domains (e.g. mycompany.com)
      const cleanHost = lowerOrigin.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
      const isCustomAllowed = await isCustomDomainAllowed(cleanHost);
      if (isCustomAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global response wrapper → { status: true, message: 'Successfully', data }
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  const config = new DocumentBuilder()
    .setTitle('Mobile Merchant API')
    .setDescription(
      'REST API and Mobile Integration specifications for the Merchant Mobile App. All successful responses follow the standard envelope format: { status: true, message: "Successfully", data: ... }',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag(
      'Mobile Merchant',
      'Merchant authentication, profile (Show My Merchant), parcels, COD settlements, pickup requests, notifications, rider chat, and image uploads',
    )
    .build();

  const fullDocument = SwaggerModule.createDocument(app, config);

  // Filter paths specifically for Mobile Merchant:
  // - All endpoints under /api/mobile/merchant
  // - Merchant auth endpoints (login, refresh, logout, device-token, forgot-password, reset-password)
  // - Mobile upload endpoints (store logo & parcel photos)
  const isMerchantPath = (path: string) => {
    return (
      path.startsWith('/api/mobile/merchant') ||
      path.startsWith('/api/notifications') ||
      path === '/api/mobile/auth/merchant/login' ||
      path === '/api/mobile/auth/refresh' ||
      path === '/api/mobile/auth/logout' ||
      path === '/api/mobile/auth/device-token' ||
      path === '/api/mobile/upload/single' ||
      path === '/api/mobile/upload'
    );
  };

  const merchantPaths: Record<string, any> = {};
  for (const [path, methods] of Object.entries(fullDocument.paths)) {
    if (isMerchantPath(path)) {
      merchantPaths[path] = {};
      for (const [method, op] of Object.entries(methods as Record<string, any>)) {
        let tag = 'Mobile Merchant';
        if (path.startsWith('/api/notifications')) {
          tag = 'Web Notifications';
        } else if (path.includes('realtime')) {
          tag = 'Mobile Merchant - Realtime';
        }
        merchantPaths[path][method] = {
          ...op,
          tags: [tag],
        };
      }
    }
  }

  const merchantDocument = {
    ...fullDocument,
    info: {
      title: 'Delivery & Merchant API',
      description:
        'REST API documentation for Web & Mobile Application. All responses follow the standard envelope format: { status: true, message: "Successfully", data: ... }',
      version: '1.0',
    },
    tags: [
      {
        name: 'Web Notifications',
        description:
          'Web Topbar & Dashboard notifications: list, unread-count, mark-as-read, read-all, delete, and real-time SSE stream',
      },
      {
        name: 'Mobile Merchant - Realtime',
        description:
          'Real-time Server-Sent Events (SSE) streams for live delivered parcels and pickup requests',
      },
      {
        name: 'Mobile Merchant',
        description:
          'Merchant authentication, profile (Show My Merchant), parcels, COD settlements, pickup requests, notifications, rider chat, and image uploads',
      },
    ],
    paths: merchantPaths,
  };

  // Primary Swagger URL: Only shows Mobile Merchant
  SwaggerModule.setup('api/docs', app, merchantDocument as any, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Full API documentation for all services (Admin, Driver, SaaS)
  SwaggerModule.setup('api/docs/all', app, fullDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  // trigger restart - db reset
}
bootstrap();
