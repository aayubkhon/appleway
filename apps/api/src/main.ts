import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  const trustedProxies = config.get('TRUST_PROXY', { infer: true });
  if (trustedProxies > 0) {
    // Lets req.ip, and with it the auth rate limit, see the real client address.
    app.set('trust proxy', trustedProxies);
  }

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  // Listening on all interfaces so a phone on the same network can reach it.
  await app.listen(port, '0.0.0.0');

  new Logger('bootstrap').log(`api listening on port ${port}`);
}

void bootstrap();
