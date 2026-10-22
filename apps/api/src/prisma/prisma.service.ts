import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';

/**
 * The single Prisma client for the process. Prisma 7 talks to Postgres through
 * a driver adapter, so the connection string is handed over here rather than
 * read from the schema.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Round trip to Postgres, used by the health endpoint. */
  async ping(): Promise<boolean> {
    const rows = await this.$queryRaw<[{ ok: number }]>`SELECT 1 AS ok`;
    return rows[0]?.ok === 1;
  }
}
