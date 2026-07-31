import db from "@/lib/db";
import { queryAllUserStats } from "@/lib/xray";

// Make BigInt serialize to JSON nicely (as strings)
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

const uncommittedTraffic: Record<string, { up: bigint, down: bigint }> = (globalThis as any).uncommittedTraffic || {};
const uncommittedUuidTraffic: Record<string, { up: bigint, down: bigint, subId: string }> = (globalThis as any).uncommittedUuidTraffic || {};
const cachedAggregates: Record<string, { h1: {up: bigint, down: bigint}, d1: {up: bigint, down: bigint}, mo1: {up: bigint, down: bigint}, total: {up: bigint, down: bigint} }> = (globalThis as any).cachedAggregates || {};
const cachedUuidAggregates: Record<string, { h1: {up: bigint, down: bigint}, d1: {up: bigint, down: bigint}, mo1: {up: bigint, down: bigint}, total: {up: bigint, down: bigint} }> = (globalThis as any).cachedUuidAggregates || {};

export const trafficState: Record<string, TrafficState> = (globalThis as any).trafficState || {};
export const uuidTrafficState: Record<string, TrafficState> = (globalThis as any).uuidTrafficState || {};

(globalThis as any).uncommittedTraffic = uncommittedTraffic;
(globalThis as any).uncommittedUuidTraffic = uncommittedUuidTraffic;
(globalThis as any).cachedAggregates = cachedAggregates;
(globalThis as any).cachedUuidAggregates = cachedUuidAggregates;
(globalThis as any).trafficState = trafficState;
(globalThis as any).uuidTrafficState = uuidTrafficState;

let isRunning = (globalThis as any).isRunning || false;
let dbSyncRunning = (globalThis as any).dbSyncRunning || false;

export function startDaemon() {
  if (isRunning) return;
  isRunning = true;
  (globalThis as any).isRunning = true;
  console.log("[Daemon] Starting traffic daemon...");
  
  const now = Date.now();
  const delay = 5000 - (now % 5000);
  
  calculateAggregations().catch(console.error);
  
  setTimeout(() => {
    tick();
    setInterval(tick, 5000);
  }, delay);
}

function updateStateObj(stateMap: Record<string, TrafficState>, id: string, live: { up: bigint, down: bigint }, uncommitted: { up: bigint, down: bigint }, agg: any) {
  stateMap[id] = {
    speedUp: live.up / BigInt(5),
    speedDown: live.down / BigInt(5),
    last5sUp: live.up,
    last5sDown: live.down,
    last1mUp: uncommitted.up,
    last1mDown: uncommitted.down,
    last1hUp: agg.h1.up + uncommitted.up,
    last1hDown: agg.h1.down + uncommitted.down,
    last1dUp: agg.d1.up + uncommitted.up,
    last1dDown: agg.d1.down + uncommitted.down,
    last1moUp: agg.mo1.up + uncommitted.up,
    last1moDown: agg.mo1.down + uncommitted.down,
    totalUp: agg.total.up + uncommitted.up,
    totalDown: agg.total.down + uncommitted.down,
  };
}

async function tick() {
  try {
    const now = new Date();
    const seconds = now.getSeconds();
    
    // Fetch live stats for ALL users in one go
    const allStats = await queryAllUserStats(true);
    
    const subLiveStats: Record<string, { up: bigint, down: bigint }> = {};
    const uuidLiveStats: Record<string, { up: bigint, down: bigint, subId: string }> = {};
    
    for (const [email, stat] of Object.entries(allStats)) {
      if (stat.up === BigInt(0) && stat.down === BigInt(0)) continue;
      
      // email format: subId_tag_uuid
      const parts = email.split('_');
      if (parts.length >= 3) {
        const subId = parts[0];
        const uuid = parts.slice(2).join('_'); // Just in case uuid has underscores
        
        if (!subLiveStats[subId]) subLiveStats[subId] = { up: BigInt(0), down: BigInt(0) };
        subLiveStats[subId].up += stat.up;
        subLiveStats[subId].down += stat.down;
        
        if (!uuidLiveStats[uuid]) uuidLiveStats[uuid] = { up: BigInt(0), down: BigInt(0), subId };
        uuidLiveStats[uuid].up += stat.up;
        uuidLiveStats[uuid].down += stat.down;
      }
    }
    
    // Process UUIDs
    for (const [uuid, live] of Object.entries(uuidLiveStats)) {
      if (!uncommittedUuidTraffic[uuid]) uncommittedUuidTraffic[uuid] = { up: BigInt(0), down: BigInt(0), subId: live.subId };
      uncommittedUuidTraffic[uuid].up += live.up;
      uncommittedUuidTraffic[uuid].down += live.down;
      
      if (!cachedUuidAggregates[uuid]) {
         cachedUuidAggregates[uuid] = { h1: {up: BigInt(0), down: BigInt(0)}, d1: {up: BigInt(0), down: BigInt(0)}, mo1: {up: BigInt(0), down: BigInt(0)}, total: {up: BigInt(0), down: BigInt(0)} };
      }
      updateStateObj(uuidTrafficState, uuid, live, uncommittedUuidTraffic[uuid], cachedUuidAggregates[uuid]);
    }
    
    // Process Subscriptions
    const subscriptions = await db.subscription.findMany({ select: { id: true } });
    for (const sub of subscriptions) {
      const subId = sub.id;
      const live = subLiveStats[subId] || { up: BigInt(0), down: BigInt(0) };
      
      if (!uncommittedTraffic[subId]) uncommittedTraffic[subId] = { up: BigInt(0), down: BigInt(0) };
      uncommittedTraffic[subId].up += live.up;
      uncommittedTraffic[subId].down += live.down;
      
      if (!cachedAggregates[subId]) {
         cachedAggregates[subId] = { h1: {up: BigInt(0), down: BigInt(0)}, d1: {up: BigInt(0), down: BigInt(0)}, mo1: {up: BigInt(0), down: BigInt(0)}, total: {up: BigInt(0), down: BigInt(0)} };
      }
      updateStateObj(trafficState, subId, live, uncommittedTraffic[subId], cachedAggregates[subId]);
    }
    
    // Every minute (at 00s), flush to DB
    if (seconds < 5 && !dbSyncRunning) {
      dbSyncRunning = true;
      (globalThis as any).dbSyncRunning = true;
      syncToDbAndAggregate().finally(() => { 
        dbSyncRunning = false; 
        (globalThis as any).dbSyncRunning = false;
      });
    }
    
  } catch (err) {
    console.error("[Daemon] Tick error:", err);
  }
}

async function syncToDbAndAggregate() {
  const subs = Object.keys(uncommittedTraffic);
  for (const subId of subs) {
    const data = uncommittedTraffic[subId];
    if (data.up === BigInt(0) && data.down === BigInt(0)) continue;
    
    // Create copy for writing and reset uncommitted
    const writeData = { up: data.up, down: data.down };
    uncommittedTraffic[subId] = { up: BigInt(0), down: BigInt(0) };
    
    await db.$transaction([
      db.trafficLog.upsert({
        where: { subscriptionId: subId },
        update: { up: { increment: writeData.up }, down: { increment: writeData.down }, lastUpdate: new Date() },
        create: { subscriptionId: subId, up: writeData.up, down: writeData.down }
      }),
      db.trafficHistory.create({
        data: { subscriptionId: subId, up: writeData.up, down: writeData.down }
      })
    ]);
  }
  
  const uuids = Object.keys(uncommittedUuidTraffic);
  for (const uuid of uuids) {
    const data = uncommittedUuidTraffic[uuid];
    if (data.up === BigInt(0) && data.down === BigInt(0)) continue;
    
    const writeData = { up: data.up, down: data.down, subId: data.subId };
    uncommittedUuidTraffic[uuid] = { up: BigInt(0), down: BigInt(0), subId: data.subId };
    
    await db.$transaction([
      db.uuidTrafficLog.upsert({
        where: { xrayUuid: uuid },
        update: { up: { increment: writeData.up }, down: { increment: writeData.down }, lastUpdate: new Date() },
        create: { xrayUuid: uuid, subscriptionId: writeData.subId, up: writeData.up, down: writeData.down }
      }),
      db.uuidTrafficHistory.create({
        data: { xrayUuid: uuid, subscriptionId: writeData.subId, up: writeData.up, down: writeData.down }
      })
    ]);
  }
  
  await calculateAggregations();
  
  // Compress if midnight
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    compressHistory().catch(console.error);
  }
}

async function calculateAggregations() {
  const now = new Date();
  const h1 = new Date(now.getTime() - 60 * 60 * 1000);
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const mo1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const subs = await db.subscription.findMany({ select: { id: true, traffic: true } });
  
  for (const sub of subs) {
    const getSum = async (since: Date) => {
      const result = await db.trafficHistory.aggregate({
        where: { subscriptionId: sub.id, timestamp: { gte: since } },
        _sum: { up: true, down: true }
      });
      return { up: BigInt(result._sum.up || 0), down: BigInt(result._sum.down || 0) };
    };

    cachedAggregates[sub.id] = {
      h1: await getSum(h1),
      d1: await getSum(d1),
      mo1: await getSum(mo1),
      total: { up: sub.traffic?.up || BigInt(0), down: sub.traffic?.down || BigInt(0) }
    };
  }

  const uuids = await db.uuidTrafficLog.findMany({ select: { xrayUuid: true, up: true, down: true } });
  
  for (const log of uuids) {
    const getSum = async (since: Date) => {
      const result = await db.uuidTrafficHistory.aggregate({
        where: { xrayUuid: log.xrayUuid, timestamp: { gte: since } },
        _sum: { up: true, down: true }
      });
      return { up: BigInt(result._sum.up || 0), down: BigInt(result._sum.down || 0) };
    };

    cachedUuidAggregates[log.xrayUuid] = {
      h1: await getSum(h1),
      d1: await getSum(d1),
      mo1: await getSum(mo1),
      total: { up: log.up, down: log.down }
    };
  }
}

async function compressHistory() {
  console.log("[Daemon] Compressing old traffic history...");
  const now = new Date();
  
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
  
  const oldRecords = await db.trafficHistory.findMany({
    where: { timestamp: { lt: cutoff }, isCompressed: false },
    orderBy: { timestamp: 'asc' }
  });
  
  if (oldRecords.length > 0) {
    const grouped: Record<string, { up: bigint, down: bigint, ids: string[] }> = {};
    for (const record of oldRecords) {
      const day = record.timestamp.toISOString().split('T')[0];
      const key = `${record.subscriptionId}_${day}`;
      if (!grouped[key]) grouped[key] = { up: BigInt(0), down: BigInt(0), ids: [] };
      grouped[key].up += record.up;
      grouped[key].down += record.down;
      grouped[key].ids.push(record.id);
    }
    for (const key of Object.keys(grouped)) {
      const [subId, dateStr] = key.split('_');
      const data = grouped[key];
      await db.$transaction([
        db.trafficHistory.create({
          data: { subscriptionId: subId, up: data.up, down: data.down, timestamp: new Date(dateStr), isCompressed: true }
        }),
        db.trafficHistory.deleteMany({ where: { id: { in: data.ids } } })
      ]);
    }
  }

  // Same for UUID history
  const oldUuidRecords = await db.uuidTrafficHistory.findMany({
    where: { timestamp: { lt: cutoff }, isCompressed: false },
    orderBy: { timestamp: 'asc' }
  });

  if (oldUuidRecords.length > 0) {
    const groupedUuid: Record<string, { up: bigint, down: bigint, ids: string[], subId: string }> = {};
    for (const record of oldUuidRecords) {
      const day = record.timestamp.toISOString().split('T')[0];
      const key = `${record.xrayUuid}_${day}`;
      if (!groupedUuid[key]) groupedUuid[key] = { up: BigInt(0), down: BigInt(0), ids: [], subId: record.subscriptionId };
      groupedUuid[key].up += record.up;
      groupedUuid[key].down += record.down;
      groupedUuid[key].ids.push(record.id);
    }
    for (const key of Object.keys(groupedUuid)) {
      const [uuid, dateStr] = key.split('_');
      const data = groupedUuid[key];
      await db.$transaction([
        db.uuidTrafficHistory.create({
          data: { xrayUuid: uuid, subscriptionId: data.subId, up: data.up, down: data.down, timestamp: new Date(dateStr), isCompressed: true }
        }),
        db.uuidTrafficHistory.deleteMany({ where: { id: { in: data.ids } } })
      ]);
    }
  }
}
