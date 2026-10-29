import db from '@/lib/db';

export interface TrafficSpeedState {
  speedUp: bigint;
  speedDown: bigint;
  last5sUp: bigint;
  last5sDown: bigint;
  last1mUp: bigint;
  last1mDown: bigint;
  last1hUp: bigint;
  last1hDown: bigint;
  last1dUp: bigint;
  last1dDown: bigint;
  last1moUp: bigint;
  last1moDown: bigint;
  totalUp: bigint;
  totalDown: bigint;
}

export interface TrafficClientState {
  subscriptions: Record<string, any>;
  uuids: Record<string, any>;
  nodes: Record<string, any>;
  timestamp: number;
}

const WORKER_URL = process.env.WORKER_URL || 'http://127.0.0.1:8007';

let cachedState: TrafficClientState | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2000;

/**
 * Retrieves the aggregated traffic state from the background worker.
 * If the worker is unavailable, falls back gracefully to embedded daemon state or database records.
 */
export async function fetchTrafficState(): Promise<TrafficClientState> {
  const now = Date.now();
  if (cachedState && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedState;
  }

  // 1. Standalone worker IPC (preferred)
  if (process.env.EMBEDDED_WORKER !== 'true') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${WORKER_URL}/state`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        cachedState = data;
        lastFetchTime = now;
        return data;
      }
    } catch {
      // Worker offline or unreachable, fall through to fallback
    }
  }

  // 2. Embedded daemon (if explicitly enabled)
  if (process.env.EMBEDDED_WORKER === 'true') {
    try {
      const { trafficState, uuidTrafficState, nodeStatusState } = await import('@/lib/trafficDaemon');
      const data: TrafficClientState = {
        subscriptions: trafficState,
        uuids: uuidTrafficState,
        nodes: nodeStatusState,
        timestamp: now
      };
      cachedState = data;
      lastFetchTime = now;
      return data;
    } catch {
      // Fall through to database
    }
  }

  // 3. Fallback: Aggregate from database
  try {
    const logs = await db.trafficLog.findMany();
    const subs: Record<string, any> = {};
    for (const log of logs) {
      if (!subs[log.subscriptionId]) {
        subs[log.subscriptionId] = {
          speedUp: 0,
          speedDown: 0,
          last5sUp: 0,
          last5sDown: 0,
          last1mUp: 0,
          last1mDown: 0,
          last1hUp: 0,
          last1hDown: 0,
          last1dUp: 0,
          last1dDown: 0,
          last1moUp: 0,
          last1moDown: 0,
          totalUp: 0,
          totalDown: 0
        };
      }
      subs[log.subscriptionId].totalUp += Number(log.up);
      subs[log.subscriptionId].totalDown += Number(log.down);
    }

    const uuidLogs = await db.uuidTrafficLog.findMany();
    const uuids: Record<string, any> = {};
    for (const log of uuidLogs) {
      uuids[log.xrayUuid] = {
        speedUp: 0,
        speedDown: 0,
        totalUp: Number(log.up),
        totalDown: Number(log.down)
      };
    }

    const fallback: TrafficClientState = {
      subscriptions: subs,
      uuids,
      nodes: {},
      timestamp: now
    };
    cachedState = fallback;
    lastFetchTime = now;
    return fallback;
  } catch {
    return { subscriptions: {}, uuids: {}, nodes: {}, timestamp: now };
  }
}

/**
 * Checks the health status of the background worker.
 */
export async function checkWorkerHealth(): Promise<{ status: string; uptime?: number } | null> {
  if (process.env.EMBEDDED_WORKER === 'true') {
    return { status: 'embedded', uptime: process.uptime() };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${WORKER_URL}/health`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeout);

    if (res.ok) {
      return await res.json();
    }
    return { status: 'unhealthy' };
  } catch {
    return { status: 'unavailable' };
  }
}
