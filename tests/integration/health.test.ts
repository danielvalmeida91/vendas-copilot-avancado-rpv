import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/prisma';

describe('Healthcheck Seam: GET /api/health', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns status 200 with application and database readiness status', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
    expect(typeof body.timestamp).toBe('string');
  });
});
