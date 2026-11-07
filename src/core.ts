import http from 'http';
import { EventEmitter } from 'events';
import db from '@/lib/db';
import { queryAllUserStats, syncNodeUsers } from '@/lib/xray';
import { cleanupExpiredUuids } from '@/lib/uuidCleanup';

// Make BigInt serialize to JSON as string
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export interface TrafficState {
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

const trafficEventEmitter = new EventEmitter();
trafficEventEmitter.setMaxListeners(500);

// In-memory state isolated within the worker process
const uncommittedTraffic: Record<string, { up: bigint; down: bigint; subId: string; nodeId: string }> = {};
const uncommittedUuidTraffic: Record<string, { up: bigint; down: bigint; subId: string; nodeId: string }> = {};

const cachedAggregates: Record<
  string,
  {
    h1: { up: bigint; down: bigint };
    d1: { up: bigint; down: bigint };
    mo1: { up: bigint; down: bigint };
    total: { up: bigint; down: bigint };
  }
> = {};

const cachedUuidAggregates: Record<
  string,
  {
    h1: { up: bigint; down: bigint };
    d1: { up: bigint; down: bigint };
    mo1: { up: bigint; down: bigint };
    total: { up: bigint; down: bigint };
  }
> = {};

export const trafficState: Record<string, TrafficState> = {};
export const uuidTrafficState: Record<string, TrafficState> = {};
export const nodeStatusState: Record<string, boolean> = {};

let isTicking = false;
let dbSyncRunning = false;
let isShuttingDown = false;
let tickTimer: NodeJS.Timeout | null = null;

function updateStateObj(
  stateMap: Record<string, TrafficState>,
  id: string,
  live: { up: bigint; down: bigint },
  uncommittedUp: bigint,
  uncommittedDown: bigint,
  agg: any
) {
  stateMap[id] = {
    speedUp: live.up / BigInt(5),
    speedDown: live.down / BigInt(5),
    last5sUp: live.up,
    last5sDown: live.down,
    last1mUp: uncommittedUp,
    last1mDown: uncommittedDown,
    last1hUp: agg.h1.up + uncommittedUp,
    last1hDown: agg.h1.down + uncommittedDown,
    last1dUp: agg.d1.up + uncommittedUp,
    last1dDown: agg.d1.down + uncommittedDown,
    last1moUp: agg.mo1.up + uncommittedUp,
    last1moDown: agg.mo1.down + uncommittedDown,
    totalUp: agg.total.up + uncommittedUp,
    totalDown: agg.total.down + uncommittedDown,
  };
}

export async function tick() {
  if (isTicking || isShuttingDown) return;
  isTicking = true;

  try {
    const now = new Date();
    const seconds = now.getSeconds();

    // Ensure apiHost standard socket path
    await db.node.updateMany({
      where: { apiHost: 'xray:7999' },
      data: { apiHost: 'unix:///app/xray/api.sock' },
    });

    const nodes = await db.node.findMany({ where: { isActive: true } });

    const subLiveStats: Record<string, { up: bigint; down: bigint }> = {};
    const subNodeLiveStats: Record<string, { up: bigint; down: bigint; subId: string; nodeId: string }> = {};
    const uuidLiveStats: Record<string, { up: bigint; down: bigint; subId: string; nodeId: string }> = {};

    for (const node of nodes) {
      const isStaticNode = !node.apiHost || node.apiHost === 'static' || node.apiHost === 'none';
      if (isStaticNode) continue;

      const allStats = await queryAllUserStats(node.apiHost, true);

      if (allStats === null) {
        nodeStatusState[node.id] = false;
        continue;
      }

      const wasOffline = nodeStatusState[node.id] === false;
      nodeStatusState[node.id] = true;

      if (wasOffline) {
        console.log(`[Worker] Node ${node.name} (${node.id}) came back ONLINE. Triggering user sync...`);
        syncNodeUsers(node.id).catch(console.error);
      }

      for (const [email, stat] of Object.entries(allStats)) {
        if (stat.up === BigInt(0) && stat.down === BigInt(0)) continue;

        const parts = email.split('_');
        if (parts.length >= 3) {
          const subId = parts[0];
          const uuid = parts[parts.length - 1];

          if (!subLiveStats[subId]) subLiveStats[subId] = { up: BigInt(0), down: BigInt(0) };
          subLiveStats[subId].up += stat.up;
          subLiveStats[subId].down += stat.down;

          const subNodeKey = `${subId}_${node.id}`;
          if (!subNodeLiveStats[subNodeKey]) {
            subNodeLiveStats[subNodeKey] = { up: BigInt(0), down: BigInt(0), subId, nodeId: node.id };
          }
          subNodeLiveStats[subNodeKey].up += stat.up;
          subNodeLiveStats[subNodeKey].down += stat.down;

          if (!uuidLiveStats[uuid]) {
            uuidLiveStats[uuid] = { up: BigInt(0), down: BigInt(0), subId, nodeId: node.id };
          }
          uuidLiveStats[uuid].up += stat.up;
          uuidLiveStats[uuid].down += stat.down;
        }
      }
    }

    // Process UUIDs
    const allKnownUuids = new Set<string>([
      ...Object.keys(cachedUuidAggregates),
      ...Object.keys(uncommittedUuidTraffic),
      ...Object.keys(uuidLiveStats),
    ]);

    for (const uuid of allKnownUuids) {
      const live = uuidLiveStats[uuid] || { up: BigInt(0), down: BigInt(0) };

      if (uuidLiveStats[uuid]) {
        if (!uncommittedUuidTraffic[uuid]) {
          uncommittedUuidTraffic[uuid] = { up: BigInt(0), down: BigInt(0), subId: live.subId, nodeId: live.nodeId };
        }
        uncommittedUuidTraffic[uuid].up += live.up;
        uncommittedUuidTraffic[uuid].down += live.down;
      }

      const uncommitted = uncommittedUuidTraffic[uuid] || { up: BigInt(0), down: BigInt(0) };

      if (!cachedUuidAggregates[uuid]) {
        cachedUuidAggregates[uuid] = {
          h1: { up: BigInt(0), down: BigInt(0) },
          d1: { up: BigInt(0), down: BigInt(0) },
          mo1: { up: BigInt(0), down: BigInt(0) },
          total: { up: BigInt(0), down: BigInt(0) },
        };
      }

      updateStateObj(uuidTrafficState, uuid, live, uncommitted.up, uncommitted.down, cachedUuidAggregates[uuid]);
    }

    // Process Subscriptions
    for (const [subNodeKey, live] of Object.entries(subNodeLiveStats)) {
      if (!uncommittedTraffic[subNodeKey]) {
        uncommittedTraffic[subNodeKey] = { up: BigInt(0), down: BigInt(0), subId: live.subId, nodeId: live.nodeId };
      }
      uncommittedTraffic[subNodeKey].up += live.up;
      uncommittedTraffic[subNodeKey].down += live.down;
    }

    const subscriptions = await db.subscription.findMany({ select: { id: true } });
    for (const sub of subscriptions) {
      const subId = sub.id;
      const live = subLiveStats[subId] || { up: BigInt(0), down: BigInt(0) };

      let totalUncommittedUp = BigInt(0);
      let totalUncommittedDown = BigInt(0);
      for (const data of Object.values(uncommittedTraffic)) {
        if (data.subId === subId) {
          totalUncommittedUp += data.up;
          totalUncommittedDown += data.down;
        }
      }

      if (!cachedAggregates[subId]) {
        cachedAggregates[subId] = {
          h1: { up: BigInt(0), down: BigInt(0) },
          d1: { up: BigInt(0), down: BigInt(0) },
          mo1: { up: BigInt(0), down: BigInt(0) },
          total: { up: BigInt(0), down: BigInt(0) },
        };
      }
      updateStateObj(trafficState, subId, live, totalUncommittedUp, totalUncommittedDown, cachedAggregates[subId]);
    }

    // Emit live update to SSE subscribers
    trafficEventEmitter.emit('update', {
      subscriptions: trafficState,
      uuids: uuidTrafficState,
      nodes: nodeStatusState,
      timestamp: Date.now(),
    });

    // Minute boundary flush and cleanup
    if (seconds < 5 && !dbSyncRunning) {
      dbSyncRunning = true;
      Promise.all([syncToDbAndAggregate(), cleanupExpiredUuids()]).finally(() => {
        dbSyncRunning = false;
      });
    }
  } catch (err) {
    console.error('[Worker] Tick error:', err);
  } finally {
    isTicking = false;
  }
}

export async function syncToDbAndAggregate() {
  const subNodeKeys = Object.keys(uncommittedTraffic);
  for (const key of subNodeKeys) {
    const data = uncommittedTraffic[key];
    if (data.up === BigInt(0) && data.down === BigInt(0)) continue;

    const writeData = { up: data.up, down: data.down, subId: data.subId, nodeId: data.nodeId };
    uncommittedTraffic[key] = { up: BigInt(0), down: BigInt(0), subId: data.subId, nodeId: data.nodeId };

    await db.$transaction([
      db.trafficLog.upsert({
        where: { subscriptionId_nodeId: { subscriptionId: writeData.subId, nodeId: writeData.nodeId } },
        update: { up: { increment: writeData.up }, down: { increment: writeData.down }, lastUpdate: new Date() },
        create: { subscriptionId: writeData.subId, nodeId: writeData.nodeId, up: writeData.up, down: writeData.down },
      }),
      db.trafficHistory.create({
        data: { subscriptionId: writeData.subId, nodeId: writeData.nodeId, up: writeData.up, down: writeData.down },
      }),
    ]);
  }

  const uuids = Object.keys(uncommittedUuidTraffic);
  for (const uuid of uuids) {
    const data = uncommittedUuidTraffic[uuid];
    if (data.up === BigInt(0) && data.down === BigInt(0)) continue;

    const writeData = { up: data.up, down: data.down, subId: data.subId, nodeId: data.nodeId };
    uncommittedUuidTraffic[uuid] = { up: BigInt(0), down: BigInt(0), subId: data.subId, nodeId: data.nodeId };

    await db.$transaction([
      db.uuidTrafficLog.upsert({
        where: { xrayUuid: uuid },
        update: { up: { increment: writeData.up }, down: { increment: writeData.down }, lastUpdate: new Date() },
        create: {
          xrayUuid: uuid,
          subscriptionId: writeData.subId,
          nodeId: writeData.nodeId,
          up: writeData.up,
          down: writeData.down,
        },
      }),
      db.uuidTrafficHistory.create({
        data: {
          xrayUuid: uuid,
          subscriptionId: writeData.subId,
          nodeId: writeData.nodeId,
          up: writeData.up,
          down: writeData.down,
        },
      }),
    ]);
  }

  await calculateAggregations();

  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    compressHistory().catch(console.error);
  }
}

export async function calculateAggregations() {
  const now = new Date();
  const h1 = new Date(now.getTime() - 60 * 60 * 1000);
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const mo1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const subs = await db.subscription.findMany({
    select: { id: true, traffic: { select: { up: true, down: true } } },
  });

  for (const sub of subs) {
    const getSum = async (since: Date) => {
      const result = await db.trafficHistory.aggregate({
        where: { subscriptionId: sub.id, timestamp: { gte: since } },
        _sum: { up: true, down: true },
      });
      return { up: BigInt(result._sum.up || 0), down: BigInt(result._sum.down || 0) };
    };

    let totalUp = BigInt(0);
    let totalDown = BigInt(0);
    for (const t of sub.traffic) {
      totalUp += t.up;
      totalDown += t.down;
    }

    cachedAggregates[sub.id] = {
      h1: await getSum(h1),
      d1: await getSum(d1),
      mo1: await getSum(mo1),
      total: { up: totalUp, down: totalDown },
    };
  }

  const inbounds = await db.subscriptionInbound.findMany({ select: { xrayUuid: true } });
  const histories = await db.uuidHistory.findMany({ select: { xrayUuid: true } });
  const logs = await db.uuidTrafficLog.findMany({ select: { xrayUuid: true, up: true, down: true } });

  const uuidSet = new Set<string>([
    ...inbounds.map((i) => i.xrayUuid),
    ...histories.map((h) => h.xrayUuid),
    ...logs.map((l) => l.xrayUuid),
  ]);

  const logMap: Record<string, { up: bigint; down: bigint }> = {};
  for (const log of logs) {
    logMap[log.xrayUuid] = { up: log.up, down: log.down };
  }

  for (const xrayUuid of uuidSet) {
    const getSum = async (since: Date) => {
      const result = await db.uuidTrafficHistory.aggregate({
        where: { xrayUuid, timestamp: { gte: since } },
        _sum: { up: true, down: true },
      });
      return { up: BigInt(result._sum.up || 0), down: BigInt(result._sum.down || 0) };
    };

    const total = logMap[xrayUuid] || { up: BigInt(0), down: BigInt(0) };

    cachedUuidAggregates[xrayUuid] = {
      h1: await getSum(h1),
      d1: await getSum(d1),
      mo1: await getSum(mo1),
      total: { up: total.up, down: total.down },
    };
  }
}

export async function compressHistory() {
  console.log('[Worker] Compressing old traffic history...');
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);

  const oldRecords = await db.trafficHistory.findMany({
    where: { timestamp: { lt: cutoff }, isCompressed: false },
    orderBy: { timestamp: 'asc' },
  });

  if (oldRecords.length > 0) {
    const grouped: Record<string, { up: bigint; down: bigint; ids: string[]; nodeId: string }> = {};
    for (const record of oldRecords) {
      const day = record.timestamp.toISOString().split('T')[0];
      const key = `${record.subscriptionId}_${record.nodeId}_${day}`;
      if (!grouped[key]) grouped[key] = { up: BigInt(0), down: BigInt(0), ids: [], nodeId: record.nodeId };
      grouped[key].up += record.up;
      grouped[key].down += record.down;
      grouped[key].ids.push(record.id);
    }
    for (const key of Object.keys(grouped)) {
      const [subId, nodeId, dateStr] = key.split('_');
      const data = grouped[key];
      await db.$transaction([
        db.trafficHistory.create({
          data: {
            subscriptionId: subId,
            nodeId: data.nodeId,
            up: data.up,
            down: data.down,
            timestamp: new Date(dateStr),
            isCompressed: true,
          },
        }),
        db.trafficHistory.deleteMany({ where: { id: { in: data.ids } } }),
      ]);
    }
  }

  const oldUuidRecords = await db.uuidTrafficHistory.findMany({
    where: { timestamp: { lt: cutoff }, isCompressed: false },
    orderBy: { timestamp: 'asc' },
  });

  if (oldUuidRecords.length > 0) {
    const groupedUuid: Record<string, { up: bigint; down: bigint; ids: string[]; subId: string; nodeId: string }> = {};
    for (const record of oldUuidRecords) {
      const day = record.timestamp.toISOString().split('T')[0];
      const key = `${record.xrayUuid}_${day}`;
      if (!groupedUuid[key]) {
        groupedUuid[key] = { up: BigInt(0), down: BigInt(0), ids: [], subId: record.subscriptionId, nodeId: record.nodeId };
      }
      groupedUuid[key].up += record.up;
      groupedUuid[key].down += record.down;
      groupedUuid[key].ids.push(record.id);
    }
    for (const key of Object.keys(groupedUuid)) {
      const [uuid, dateStr] = key.split('_');
      const data = groupedUuid[key];
      await db.$transaction([
        db.uuidTrafficHistory.create({
          data: {
            xrayUuid: uuid,
            subscriptionId: data.subId,
            nodeId: data.nodeId,
            up: data.up,
            down: data.down,
            timestamp: new Date(dateStr),
            isCompressed: true,
          },
        }),
        db.uuidTrafficHistory.deleteMany({ where: { id: { in: data.ids } } }),
      ]);
    }
  }
}

/**
 * Creates internal IPC server for Next.js communication
 */
export function createWorkerServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }));
      return;
    }

    if (url.pathname === '/state') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      });
      res.end(
        JSON.stringify(
          {
            subscriptions: trafficState,
            uuids: uuidTrafficState,
            nodes: nodeStatusState,
            timestamp: Date.now(),
          },
          (key, value) => (typeof value === 'bigint' ? value.toString() : value)
        )
      );
      return;
    }

    if (url.pathname === '/sse') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      });

      // Send initial snapshot
      const snapshot = `data: ${JSON.stringify(
        {
          subscriptions: trafficState,
          uuids: uuidTrafficState,
          nodes: nodeStatusState,
          timestamp: Date.now(),
        },
        (key, value) => (typeof value === 'bigint' ? value.toString() : value)
      )}\n\n`;
      res.write(snapshot);

      const onUpdate = (data: any) => {
        try {
          const payload = `data: ${JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )}\n\n`;
          res.write(payload);
        } catch {}
      };

      trafficEventEmitter.on('update', onUpdate);

      req.on('close', () => {
        trafficEventEmitter.off('update', onUpdate);
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

export function startWorker() {
  console.log('[Utka-Core] Starting Utka Core Engine (background worker)...');
  const port = Number(process.env.CORE_PORT || process.env.WORKER_PORT) || 8007;
  const host = process.env.CORE_HOST || process.env.WORKER_HOST || '0.0.0.0';

  const server = createWorkerServer();
  server.listen(port, host, () => {
    console.log(`[Utka-Core] Internal stats/IPC server listening on http://${host}:${port}`);
  });

  calculateAggregations().catch(console.error);

  const now = Date.now();
  const delay = 5000 - (now % 5000);

  setTimeout(() => {
    tick();
    tickTimer = setInterval(tick, 5000);
  }, delay);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Worker] Received ${signal}. Shutting down gracefully...`);

    if (tickTimer) clearInterval(tickTimer);

    try {
      console.log('[Worker] Flushing pending uncommitted traffic to database...');
      await syncToDbAndAggregate();
    } catch (err) {
      console.error('[Worker] Error during shutdown flush:', err);
    }

    server.close(() => {
      console.log('[Worker] HTTP server closed.');
    });

    try {
      await db.$disconnect();
    } catch {}

    console.log('[Utka-Core] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { server, shutdown };
}

// Auto-start if executed as main script
if (require.main === module || process.env.RUN_WORKER === 'true' || process.env.RUN_CORE === 'true') {
  startWorker();
}
