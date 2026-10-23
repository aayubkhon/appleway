import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { LedgerModule } from './ledger/ledger.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { validateEnv } from './config/env.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    LedgerModule,
  ],
})
export class AppModule {}
