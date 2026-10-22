import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  beforeEach(() => {
    // The failure path logs on purpose; keep the test output readable.
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const buildService = async (ping: () => Promise<boolean>): Promise<HealthService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [HealthService, { provide: PrismaService, useValue: { ping } }],
    }).compile();

    return moduleRef.get(HealthService);
  };

  it('reports ok when the database answers', async () => {
    const service = await buildService(() => Promise.resolve(true));

    const report = await service.check();

    expect(report.status).toBe('ok');
    expect(report.database).toBe('up');
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('reports degraded when the database query fails', async () => {
    const service = await buildService(() => Promise.reject(new Error('connection refused')));

    const report = await service.check();

    expect(report.status).toBe('degraded');
    expect(report.database).toBe('down');
  });

  it('reports degraded when the database answers unexpectedly', async () => {
    const service = await buildService(() => Promise.resolve(false));

    expect((await service.check()).status).toBe('degraded');
  });
});
