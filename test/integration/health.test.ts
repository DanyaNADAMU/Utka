import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: {
    $queryRaw: vi.fn(),
  },
}));

import db from '@/lib/db';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status ok or degraded with 200 when database is healthy', async () => {
    (db.$queryRaw as any).mockResolvedValueOnce([{ '?column?': 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(['ok', 'degraded']).toContain(data.status);
    expect(data.services.database.status).toBe('connected');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptimeSeconds');
  });

  it('returns status unhealthy with 503 when database fails', async () => {
    (db.$queryRaw as any).mockRejectedValueOnce(new Error('Connection refused'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.services.database.status).toBe('error');
    expect(data.services.database.error).toContain('Connection refused');
  });
});
