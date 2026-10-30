import { Controller, Get, Header, HttpCode } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Handle browser Service Worker requests to prevent 404 errors in console
  @Get(['sw.js', 'service-worker.js', 'firebase-messaging-sw.js'])
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  getServiceWorker(): string {
    return '// No-op Service Worker\nself.addEventListener("install", () => self.skipWaiting());\nself.addEventListener("activate", () => self.clients.claim());\n';
  }

  // Handle browser favicon probes
  @Get('favicon.ico')
  @HttpCode(204)
  getFavicon(): void {}
}
