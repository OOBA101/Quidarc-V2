import { describe, expect, it } from 'vitest';
import { createHealthRoutes } from './health.js';

describe('health route', () => {
  it('returns ok status', async () => {
    const app = await import('fastify').then(({ default: Fastify }) => Fastify());
    await app.register(createHealthRoutes);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true });
  });
});
