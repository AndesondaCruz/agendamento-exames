import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv, type Env } from './config/env.js';
import { buildTypeOrmOptions } from './database/typeorm.options.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Valida e tipa process.env no boot; a API não sobe com config inválida.
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildTypeOrmOptions({
          DATABASE_URL: config.get('DATABASE_URL', { infer: true }),
          DATABASE_SSL: config.get('DATABASE_SSL', { infer: true }),
        }),
    }),
  ],
})
export class AppModule {}
