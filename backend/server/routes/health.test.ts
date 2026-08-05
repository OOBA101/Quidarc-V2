import { describe, expect, it } from 'vitest';
import { createHealthRoutes } from './health.js';

describe('health route', () => {
  it('returns health status payload with database indicator', async () => {
    const app = await import('fastify').then(({ default: Fastify }) => Fastify());
    await app.register(createHealthRoutes);

    const response = await app.inject({ method: 'GET', url: '/health' });

    const body = response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('version', '1.0.0');
    expect(body).toHaveProperty('timestamp');

    // 200 only when the database is reachable; otherwise a strict 503 so the
    // health probe reflects real backend readiness. In unit tests there is no
    // database, so this asserts the degraded path resolves to 503.
    if (body.database === 'connected') {
      expect(response.statusCode).toBe(200);
      expect(body.status).toBe('ok');
    } else {
      expect(response.statusCode).toBe(503);
      expect(body.status).toBe('degraded');
    }
  });
});
