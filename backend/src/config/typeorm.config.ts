import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (config: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: config.get<number>('DATABASE_PORT', 5432),
    username: config.get<string>('DATABASE_USERNAME', 'postgres'),
    password: config.get<string>('DATABASE_PASSWORD', 'postgres'),
    database: config.get<string>('DATABASE_NAME', 'postgres'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../**/*.migration{.ts,.js}'],
    synchronize: config.get<string>('DATABASE_SYNCHRONIZE', 'true') === 'true',
    logging: true,
});
