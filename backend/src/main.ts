import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { API_PREFIX, configureApp } from './app.setup.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = app
    .get<ConfigService<Env, true>>(ConfigService)
    .get('PORT', { infer: true });
  // 0.0.0.0: dentro do container, escutar só em localhost tornaria a API inacessível.
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`API em http://localhost:${port}/${API_PREFIX}`);
  logger.log(`Swagger em http://localhost:${port}/${API_PREFIX}/docs`);
}

await bootstrap();
