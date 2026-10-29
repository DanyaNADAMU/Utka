import { describe, it, expect, vi } from 'vitest';
import { cleanupExpiredUuids } from '@/lib/uuidCleanup';

describe('cleanupExpiredUuids', () => {
  it('does nothing when there are no expired UUIDs', async () => {
    const mockDb = {
      expiringUuid: {
        findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
      },
    };
    const mockRemove = vi.fn();

    const res = await cleanupExpiredUuids(mockDb as any, mockRemove);
    expect(res).toEqual({ totalExpired: 0, cleaned: 0, errors: 0 });
    expect(mockDb.expiringUuid.findMany).toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockDb.expiringUuid.delete).not.toHaveBeenCalled();
  });

  it('removes expired UUIDs from Xray and deletes database records', async () => {
    const expiredRecords = [
      {
        id: 'rec-1',
        xrayUuid: 'uuid-1',
        xrayEmail: 'sub1_inbound1_uuid-1',
        inboundTag: 'vless-reality-ipv4',
        node: { apiHost: 'unix:///run/xray/test.sock' },
      },
      {
        id: 'rec-2',
        xrayUuid: 'uuid-2',
        xrayEmail: 'sub1_inbound2_uuid-2',
        inboundTag: 'vless-reality-ipv6',
        node: null,
      },
    ];

    const mockDb = {
      expiringUuid: {
        findMany: vi.fn().mockResolvedValue(expiredRecords),
        delete: vi.fn().mockResolvedValue({ id: 'deleted' }),
      },
    };
    const mockRemove = vi.fn().mockResolvedValue(true);

    const res = await cleanupExpiredUuids(mockDb as any, mockRemove);
    expect(res).toEqual({ totalExpired: 2, cleaned: 2, errors: 0 });

    expect(mockRemove).toHaveBeenCalledTimes(2);
    expect(mockRemove).toHaveBeenNthCalledWith(1, 'unix:///run/xray/test.sock', 'vless-reality-ipv4', 'sub1_inbound1_uuid-1');
    expect(mockRemove).toHaveBeenNthCalledWith(2, 'unix:///app/xray/api.sock', 'vless-reality-ipv6', 'sub1_inbound2_uuid-2');

    expect(mockDb.expiringUuid.delete).toHaveBeenCalledTimes(2);
    expect(mockDb.expiringUuid.delete).toHaveBeenNthCalledWith(1, { where: { id: 'rec-1' } });
    expect(mockDb.expiringUuid.delete).toHaveBeenNthCalledWith(2, { where: { id: 'rec-2' } });
  });
});
