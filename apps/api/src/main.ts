import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  // Listening on all interfaces so a phone on the same network can reach it.
  await app.listen(port, '0.0.0.0');

  new Logger('bootstrap').log(`api listening on port ${port}`);
}

void bootstrap();
