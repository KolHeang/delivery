import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedModule } from './seed/seed.module';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [AppModule, SeedModule],
})
class SeedAppModule {}

async function bootstrap() {
  console.log('Starting standalone database seeding...');
  const app = await NestFactory.createApplicationContext(SeedAppModule);
  const seedService = app.get(SeedService);
  const result = await seedService.seedSuperAdminData();
  console.log('Seeding result:', JSON.stringify(result, null, 2));
  console.log('✅ Standalone database seeding completed successfully.');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Database seeding failed:', err);
  process.exit(1);
});

