import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload limit for base64 images (POD photos, signature)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS
  app.enableCors({
    origin: true, // This allows ANY origin to connect
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
      path === '/api/mobile/auth/merchant/login' ||
      path === '/api/mobile/auth/refresh' ||
      path === '/api/mobile/auth/logout' ||
      path === '/api/mobile/auth/device-token' ||
      path === '/api/mobile/auth/forgot-password' ||
      path === '/api/mobile/auth/reset-password' ||
      path.startsWith('/api/mobile/upload')
    );
  };

  const merchantPaths: Record<string, any> = {};
  for (const [path, methods] of Object.entries(fullDocument.paths)) {
    if (isMerchantPath(path)) {
      merchantPaths[path] = {};
      for (const [method, op] of Object.entries(methods as Record<string, any>)) {
        merchantPaths[path][method] = {
          ...op,
          tags: ['Mobile Merchant'], // Consolidate all operations strictly under "Mobile Merchant"
        };
      }
    }
  }

  const merchantDocument = {
    ...fullDocument,
    info: {
      title: 'Mobile Merchant API',
      description:
        'REST API documentation for Merchant Mobile Application. All responses follow the standard format: { status: true, message: "Successfully", data: ... }',
      version: '1.0',
    },
    tags: [
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
