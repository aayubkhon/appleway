import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export type HealthStatus = 'ok' | 'degraded';

export interface HealthReport {
  status: HealthStatus;
  database: 'up' | 'down';
  uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const database = await this.checkDatabase();

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      return (await this.prisma.ping()) ? 'up' : 'down';
    } catch (error) {
      this.logger.error('database health check failed', error instanceof Error ? error.stack : '');
      return 'down';
    }
  }
}
