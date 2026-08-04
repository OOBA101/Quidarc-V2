import { describe, expect, it } from 'vitest';
import { createHealthRoutes } from './health.js';

describe('health route', () => {
  it('returns health status payload with database indicator', async () => {
    const app = await import('fastify').then(({ default: Fastify }) => Fastify());
    await app.register(createHealthRoutes);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('version', '1.0.0');
    expect(body).toHaveProperty('timestamp');
  });
});
