import { describe, it, expect, vi } from 'vitest';
import { createNodeReconcileTracker, reconcileNodeIfNeeded } from '@/core';

describe('reconcileNodeIfNeeded', () => {
  const node = {
    id: 'node-glacier',
    name: 'Glacier',
    apiHost: 'unix:///run/xray/xray-api.sock',
  };

  it('syncs on initial boot and skips subsequent steady-state ticks', async () => {
    const tracker = createNodeReconcileTracker();
    const getSysStatsFn = vi.fn().mockResolvedValue({ uptime: 120 });
    const syncFn = vi.fn().mockResolvedValue({ total: 4, success: 4 });

    const first = await reconcileNodeIfNeeded(node, false, tracker, { getSysStatsFn, syncFn });
    expect(first).toBe(true);
    expect(syncFn).toHaveBeenCalledTimes(1);

    getSysStatsFn.mockResolvedValue({ uptime: 125 });
    const second = await reconcileNodeIfNeeded(node, false, tracker, { getSysStatsFn, syncFn });
    expect(second).toBe(false);
    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it('detects fast Xray restart via uptime drop between 5s ticks and resyncs', async () => {
    const tracker = createNodeReconcileTracker();
    const getSysStatsFn = vi.fn().mockResolvedValue({ uptime: 500 });
    const syncFn = vi.fn().mockResolvedValue({ total: 3, success: 3 });

    await reconcileNodeIfNeeded(node, false, tracker, { getSysStatsFn, syncFn });
    expect(syncFn).toHaveBeenCalledTimes(1);

    // Xray restarted in <5s, so tick() never saw offline, but uptime reset from 500 to 2
    getSysStatsFn.mockResolvedValue({ uptime: 2 });
    const resynced = await reconcileNodeIfNeeded(node, false, tracker, { getSysStatsFn, syncFn });
    expect(resynced).toBe(true);
    expect(syncFn).toHaveBeenCalledTimes(2);
  });

  it('resyncs when node recovers from offline state and retries partial failures', async () => {
    const tracker = createNodeReconcileTracker();
    const getSysStatsFn = vi.fn().mockResolvedValue({ uptime: 50 });
    const syncFn = vi.fn()
      .mockResolvedValueOnce({ total: 2, success: 1 })
      .mockResolvedValueOnce({ total: 2, success: 2 })
      .mockResolvedValueOnce({ total: 2, success: 2 });

    // Partial failure on first tick keeps syncedOnBoot=false so next tick retries
    await reconcileNodeIfNeeded(node, false, tracker, { getSysStatsFn, syncFn });
    expect(tracker.syncedOnBoot[node.id]).toBeUndefined();

    await reconcileNodeIfNeeded(node, false, tracker, { getSysStatsFn, syncFn });
    expect(tracker.syncedOnBoot[node.id]).toBe(true);
    expect(syncFn).toHaveBeenCalledTimes(2);

    // Offline recovery triggers another sync even if uptime wasn't tracked
    const recovered = await reconcileNodeIfNeeded(node, true, tracker, { getSysStatsFn, syncFn });
    expect(recovered).toBe(true);
    expect(syncFn).toHaveBeenCalledTimes(3);
  });
});
