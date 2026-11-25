import { describe, it, expect, vi } from 'vitest';
import { syncNodeUsers } from '@/lib/xray';

describe('syncNodeUsers', () => {
  it('returns 0 when node is not found or inactive', async () => {
    const mockDb = {
      node: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const mockAddUser = vi.fn();

    const res = await syncNodeUsers('missing-node', mockDb as any, mockAddUser);
    expect(res).toEqual({ total: 0, success: 0 });
    expect(mockAddUser).not.toHaveBeenCalled();

    const mockInactiveDb = {
      node: {
        findUnique: vi.fn().mockResolvedValue({ id: 'node-1', isActive: false, apiHost: 'unix:///run/xray.sock' }),
      },
    };
    const resInactive = await syncNodeUsers('node-1', mockInactiveDb as any, mockAddUser);
    expect(resInactive).toEqual({ total: 0, success: 0 });
    expect(mockAddUser).not.toHaveBeenCalled();
  });

  it('returns 0 when node is static or none', async () => {
    const mockDb = {
      node: {
        findUnique: vi.fn().mockResolvedValue({ id: 'node-static', isActive: true, apiHost: 'static' }),
      },
    };
    const mockAddUser = vi.fn();

    const res = await syncNodeUsers('node-static', mockDb as any, mockAddUser);
    expect(res).toEqual({ total: 0, success: 0 });
    expect(mockAddUser).not.toHaveBeenCalled();
  });

  it('syncs both active subscription inbounds and unexpired expiring UUIDs', async () => {
    const mockNode = {
      id: 'node-active',
      name: 'Moscow Edge',
      isActive: true,
      apiHost: 'unix:///run/xray/api.sock',
    };

    const inbounds = [
      {
        id: 'inb-1',
        subscriptionId: 'sub-1',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-active-1',
        nodeId: 'node-active',
      },
      {
        id: 'inb-2',
        subscriptionId: 'sub-2',
        inboundTag: 'vless-frankfurt',
        xrayUuid: 'uuid-active-2',
        nodeId: 'node-active',
      },
    ];

    const expiring = [
      {
        id: 'exp-1',
        subscriptionId: 'sub-1',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-expiring-1',
        xrayEmail: 'sub-1_vless-in_uuid-expiring-1',
        nodeId: 'node-active',
        expiresAt: new Date(Date.now() + 86400000),
      },
    ];

    const mockDb = {
      node: {
        findUnique: vi.fn().mockResolvedValue(mockNode),
      },
      subscriptionInbound: {
        findMany: vi.fn().mockResolvedValue(inbounds),
      },
      expiringUuid: {
        findMany: vi.fn().mockResolvedValue(expiring),
      },
    };

    const mockAddUser = vi.fn().mockResolvedValue(true);

    const res = await syncNodeUsers('node-active', mockDb as any, mockAddUser);

    expect(res).toEqual({ total: 3, success: 3 });
    expect(mockDb.subscriptionInbound.findMany).toHaveBeenCalledWith({
      where: { nodeId: 'node-active' },
    });
    expect(mockDb.expiringUuid.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nodeId: 'node-active',
        }),
      })
    );

    expect(mockAddUser).toHaveBeenCalledTimes(3);
    expect(mockAddUser).toHaveBeenNthCalledWith(
      1,
      'unix:///run/xray/api.sock',
      'vless-in',
      'sub-1_vless-in_uuid-active-1',
      'uuid-active-1'
    );
    expect(mockAddUser).toHaveBeenNthCalledWith(
      2,
      'unix:///run/xray/api.sock',
      'vless-frankfurt',
      'sub-2_vless-frankfurt_uuid-active-2',
      'uuid-active-2'
    );
    expect(mockAddUser).toHaveBeenNthCalledWith(
      3,
      'unix:///run/xray/api.sock',
      'vless-in',
      'sub-1_vless-in_uuid-expiring-1',
      'uuid-expiring-1'
    );
  });

  it('deduplicates identical inboundTag and xrayUuid pairs and tracks partial failures', async () => {
    const mockNode = {
      id: 'node-1',
      name: 'Glacier',
      isActive: true,
      apiHost: 'unix:///run/xray/api.sock',
    };

    const inbounds = [
      {
        id: 'inb-1',
        subscriptionId: 'sub-1',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-overlap',
        nodeId: 'node-1',
      },
    ];

    const expiring = [
      {
        id: 'exp-overlap',
        subscriptionId: 'sub-1',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-overlap',
        xrayEmail: 'sub-1_vless-in_uuid-overlap',
        nodeId: 'node-1',
        expiresAt: new Date(Date.now() + 3600000),
      },
      {
        id: 'exp-failed',
        subscriptionId: 'sub-2',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-fail',
        xrayEmail: 'sub-2_vless-in_uuid-fail',
        nodeId: 'node-1',
        expiresAt: new Date(Date.now() + 3600000),
      },
    ];

    const mockDb = {
      node: {
        findUnique: vi.fn().mockResolvedValue(mockNode),
      },
      subscriptionInbound: {
        findMany: vi.fn().mockResolvedValue(inbounds),
      },
      expiringUuid: {
        findMany: vi.fn().mockResolvedValue(expiring),
      },
    };

    // First succeeds, second fails
    const mockAddUser = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const res = await syncNodeUsers('node-1', mockDb as any, mockAddUser);

    expect(res).toEqual({ total: 2, success: 1 });
    expect(mockAddUser).toHaveBeenCalledTimes(2);
  });

  it('skips users already present in Xray inbound and only adds missing ones', async () => {
    const mockNode = {
      id: 'node-1',
      name: 'Glacier',
      isActive: true,
      apiHost: 'unix:///run/xray/api.sock',
    };

    const inbounds = [
      {
        id: 'inb-1',
        subscriptionId: 'sub-1',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-present',
        nodeId: 'node-1',
      },
      {
        id: 'inb-2',
        subscriptionId: 'sub-2',
        inboundTag: 'vless-in',
        xrayUuid: 'uuid-missing',
        nodeId: 'node-1',
      },
    ];

    const expiring = [
      {
        id: 'exp-1',
        subscriptionId: 'sub-3',
        inboundTag: 'vless-frankfurt',
        xrayUuid: 'uuid-exp-present',
        xrayEmail: 'sub-3_vless-frankfurt_uuid-exp-present',
        nodeId: 'node-1',
        expiresAt: new Date(Date.now() + 3600000),
      },
    ];

    const mockDb = {
      node: { findUnique: vi.fn().mockResolvedValue(mockNode) },
      subscriptionInbound: { findMany: vi.fn().mockResolvedValue(inbounds) },
      expiringUuid: { findMany: vi.fn().mockResolvedValue(expiring) },
    };

    const mockAddUser = vi.fn().mockResolvedValue(true);
    const mockGetInboundUsers = vi.fn().mockImplementation(async (_host: string, tag: string) => {
      if (tag === 'vless-in') return ['sub-1_vless-in_uuid-present'];
      if (tag === 'vless-frankfurt') return ['sub-3_vless-frankfurt_uuid-exp-present'];
      return [];
    });

    const res = await syncNodeUsers('node-1', mockDb as any, mockAddUser, mockGetInboundUsers);

    expect(res).toEqual({ total: 3, success: 3 });
    expect(mockAddUser).toHaveBeenCalledTimes(1);
    expect(mockAddUser).toHaveBeenCalledWith(
      'unix:///run/xray/api.sock',
      'vless-in',
      'sub-2_vless-in_uuid-missing',
      'uuid-missing'
    );
  });

  it('falls back to adding all users when getInboundUsers returns null', async () => {
    const mockNode = {
      id: 'node-1',
      name: 'Glacier',
      isActive: true,
      apiHost: 'unix:///run/xray/api.sock',
    };

    const mockDb = {
      node: { findUnique: vi.fn().mockResolvedValue(mockNode) },
      subscriptionInbound: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'inb-1', subscriptionId: 'sub-1', inboundTag: 'vless-in', xrayUuid: 'uuid-1', nodeId: 'node-1' },
        ]),
      },
      expiringUuid: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const mockAddUser = vi.fn().mockResolvedValue(true);
    const mockGetInboundUsers = vi.fn().mockResolvedValue(null);

    const res = await syncNodeUsers('node-1', mockDb as any, mockAddUser, mockGetInboundUsers);

    expect(res).toEqual({ total: 1, success: 1 });
    expect(mockAddUser).toHaveBeenCalledTimes(1);
  });
});
