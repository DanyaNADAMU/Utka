import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSubServer } from '@/sub';
import { checkSubHealth } from '@/lib/subClient';
import { getConfigIniContent, DEFAULT_CONFIG_INI } from '@/lib/clashConfig';
import http from 'http';

// Mock DB for sub tests
vi.mock('@/lib/db', () => ({
  default: {
    setting: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    node: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('dash-sub service', () => {
  let server: http.Server;
  let port: number;

  beforeEach(async () => {
    server = createSubServer();
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

  it('serves /health endpoint with ok status and service identifier', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('utka-sub');
    expect(typeof data.uptime).toBe('number');
  });

  it('serves /config.ini endpoint with rule configuration', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/config.ini`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('clash_mode=rule');
    expect(text).toContain('custom_proxy_group');
  });

  it('serves /api/config.ini endpoint identically to /config.ini', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/config.ini`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('clash_mode=rule');
  });

  it('returns 404 for path with mismatching segment count', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/extra/segments/sub/invalid`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown token', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/unknown-token`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Not found');
  });

  it('checkSubHealth returns ok when connected to active server', async () => {
    const originalSubUrl = process.env.SUB_URL;
    process.env.SUB_URL = `http://127.0.0.1:${port}`;
    try {
      const health = await checkSubHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('utka-sub');
      expect(typeof health.uptime).toBe('number');
    } finally {
      process.env.SUB_URL = originalSubUrl;
    }
  });

  it('checkSubHealth returns embedded when EMBEDDED_SUB is true', async () => {
    const originalEmbedded = process.env.EMBEDDED_SUB;
    process.env.EMBEDDED_SUB = 'true';
    try {
      const health = await checkSubHealth();
      expect(health.status).toBe('embedded');
    } finally {
      process.env.EMBEDDED_SUB = originalEmbedded;
    }
  });

  it('getConfigIniContent returns valid default configuration if file missing', async () => {
    const originalConfigIniPath = process.env.CONFIG_INI_PATH;
    process.env.CONFIG_INI_PATH = '/tmp/nonexistent-config.ini';
    try {
      const config = await getConfigIniContent();
      expect(config).toBe(DEFAULT_CONFIG_INI);
      expect(config).toContain('clash_mode=rule');
    } finally {
      process.env.CONFIG_INI_PATH = originalConfigIniPath;
    }
  });
});
