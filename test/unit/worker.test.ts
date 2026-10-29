import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWorkerServer } from '@/worker';
import http from 'http';

describe('createWorkerServer', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    server = createWorkerServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('serves /health endpoint with ok status', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
  });

  it('serves /state endpoint with subscriptions, uuids, and nodes', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/state`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('subscriptions');
    expect(data).toHaveProperty('uuids');
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('timestamp');
  });

  it('returns 404 for unknown endpoints', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.status).toBe(404);
  });
});
