import db from "@/lib/db";
import { queryAllUserStats, syncNodeUsers } from "@/lib/xray";

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

// uncommitted is keyed by `${subId}_${nodeId}`
const uncommittedTraffic: Record<string, { up: bigint, down: bigint, subId: string, nodeId: string }> = (globalThis as any).uncommittedTraffic || {};
// uuid traffic is keyed by uuid
const uncommittedUuidTraffic: Record<string, { up: bigint, down: bigint, subId: string, nodeId: string }> = (globalThis as any).uncommittedUuidTraffic || {};

// cached aggregates for sub (overall)
const cachedAggregates: Record<string, { h1: {up: bigint, down: bigint}, d1: {up: bigint, down: bigint}, mo1: {up: bigint, down: bigint}, total: {up: bigint, down: bigint} }> = (globalThis as any).cachedAggregates || {};
// cached aggregates for uuid
const cachedUuidAggregates: Record<string, { h1: {up: bigint, down: bigint}, d1: {up: bigint, down: bigint}, mo1: {up: bigint, down: bigint}, total: {up: bigint, down: bigint} }> = (globalThis as any).cachedUuidAggregates || {};

// These are global states for UI (keyed by subId)
export const trafficState: Record<string, TrafficState> = (globalThis as any).trafficState || {};
export const uuidTrafficState: Record<string, TrafficState> = (globalThis as any).uuidTrafficState || {};
export const nodeStatusState: Record<string, boolean> = (globalThis as any).nodeStatusState || {};

(globalThis as any).uncommittedTraffic = uncommittedTraffic;
(globalThis as any).uncommittedUuidTraffic = uncommittedUuidTraffic;
(globalThis as any).cachedAggregates = cachedAggregates;
(globalThis as any).cachedUuidAggregates = cachedUuidAggregates;
(globalThis as any).nodeStatusState = nodeStatusState;
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

function updateStateObj(stateMap: Record<string, TrafficState>, id: string, live: { up: bigint, down: bigint }, uncommittedUp: bigint, uncommittedDown: bigint, agg: any) {
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

let isTicking = false;

async function tick() {
  if (isTicking) return;
  isTicking = true;
  
  try {
    const now = new Date();
    const seconds = now.getSeconds();

    const nodes = await db.node.findMany({ where: { isActive: true } });
    
    const subLiveStats: Record<string, { up: bigint, down: bigint }> = {}; // Overall for sub
    const subNodeLiveStats: Record<string, { up: bigint, down: bigint, subId: string, nodeId: string }> = {}; // Per node
    const uuidLiveStats: Record<string, { up: bigint, down: bigint, subId: string, nodeId: string }> = {};
    
    for (const node of nodes) {
      console.log(`[Daemon] Querying stats for node ${node.name} (${node.id}) at ${node.apiHost}...`);
      const allStats = await queryAllUserStats(node.apiHost, true);
      
      if (allStats === null) {
        console.log(`[Daemon] Node ${node.name} (${node.id}) returned NULL (OFFLINE)`);
        nodeStatusState[node.id] = false;
        continue;
      }
      const wasOffline = nodeStatusState[node.id] === false;
      console.log(`[Daemon] Node ${node.name} (${node.id}) returned stats (ONLINE)`);
      nodeStatusState[node.id] = true;
      if (wasOffline) {
        console.log(`[Daemon] Node ${node.name} (${node.id}) came back ONLINE. Triggering user sync...`);
        syncNodeUsers(node.id).catch(console.error);
      }
      
      for (const [email, stat] of Object.entries(allStats)) {
        if (stat.up === BigInt(0) && stat.down === BigInt(0)) continue;
        
        // email format: subId_tag_uuid or subId_master_tag_uuid
        const parts = email.split('_');
        if (parts.length >= 3) {
          const subId = parts[0];
          const uuid = parts[parts.length - 1]; // UUID is always the last component
          
          if (!subLiveStats[subId]) subLiveStats[subId] = { up: BigInt(0), down: BigInt(0) };
          subLiveStats[subId].up += stat.up;
          subLiveStats[subId].down += stat.down;
          
          const subNodeKey = `${subId}_${node.id}`;
          if (!subNodeLiveStats[subNodeKey]) subNodeLiveStats[subNodeKey] = { up: BigInt(0), down: BigInt(0), subId, nodeId: node.id };
          subNodeLiveStats[subNodeKey].up += stat.up;
          subNodeLiveStats[subNodeKey].down += stat.down;
          
          if (!uuidLiveStats[uuid]) uuidLiveStats[uuid] = { up: BigInt(0), down: BigInt(0), subId, nodeId: node.id };
          uuidLiveStats[uuid].up += stat.up;
          uuidLiveStats[uuid].down += stat.down;
        }
      }
    }
    
    // Process UUIDs (update state for ALL known UUIDs, resetting live speed to 0 if inactive)
    const allKnownUuids = new Set<string>([
      ...Object.keys(cachedUuidAggregates),
      ...Object.keys(uncommittedUuidTraffic),
      ...Object.keys(uuidLiveStats)
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
         cachedUuidAggregates[uuid] = { h1: {up: BigInt(0), down: BigInt(0)}, d1: {up: BigInt(0), down: BigInt(0)}, mo1: {up: BigInt(0), down: BigInt(0)}, total: {up: BigInt(0), down: BigInt(0)} };
      }
      
      updateStateObj(uuidTrafficState, uuid, live, uncommitted.up, uncommitted.down, cachedUuidAggregates[uuid]);
    }
    
    // Process Subscriptions (overall UI state + uncommitted node state)
    // First, accumulate uncommitted Node stats
    for (const [subNodeKey, live] of Object.entries(subNodeLiveStats)) {
      if (!uncommittedTraffic[subNodeKey]) uncommittedTraffic[subNodeKey] = { up: BigInt(0), down: BigInt(0), subId: live.subId, nodeId: live.nodeId };
      uncommittedTraffic[subNodeKey].up += live.up;
      uncommittedTraffic[subNodeKey].down += live.down;
    }
    
    // Then, update overall UI state
    const subscriptions = await db.subscription.findMany({ select: { id: true } });
    for (const sub of subscriptions) {
      const subId = sub.id;
      const live = subLiveStats[subId] || { up: BigInt(0), down: BigInt(0) };
      
      let totalUncommittedUp = BigInt(0);
      let totalUncommittedDown = BigInt(0);
      for (const [key, data] of Object.entries(uncommittedTraffic)) {
        if (data.subId === subId) {
          totalUncommittedUp += data.up;
          totalUncommittedDown += data.down;
        }
      }
      
      if (!cachedAggregates[subId]) {
         cachedAggregates[subId] = { h1: {up: BigInt(0), down: BigInt(0)}, d1: {up: BigInt(0), down: BigInt(0)}, mo1: {up: BigInt(0), down: BigInt(0)}, total: {up: BigInt(0), down: BigInt(0)} };
      }
      updateStateObj(trafficState, subId, live, totalUncommittedUp, totalUncommittedDown, cachedAggregates[subId]);
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
  } finally {
    isTicking = false;
  }
}

async function syncToDbAndAggregate() {
  const subNodeKeys = Object.keys(uncommittedTraffic);
  for (const key of subNodeKeys) {
    const data = uncommittedTraffic[key];
    if (data.up === BigInt(0) && data.down === BigInt(0)) continue;
    
    // Create copy for writing and reset uncommitted
    const writeData = { up: data.up, down: data.down, subId: data.subId, nodeId: data.nodeId };
    uncommittedTraffic[key] = { up: BigInt(0), down: BigInt(0), subId: data.subId, nodeId: data.nodeId };
    
    await db.$transaction([
      db.trafficLog.upsert({
        where: { subscriptionId_nodeId: { subscriptionId: writeData.subId, nodeId: writeData.nodeId } },
        update: { up: { increment: writeData.up }, down: { increment: writeData.down }, lastUpdate: new Date() },
        create: { subscriptionId: writeData.subId, nodeId: writeData.nodeId, up: writeData.up, down: writeData.down }
      }),
      db.trafficHistory.create({
        data: { subscriptionId: writeData.subId, nodeId: writeData.nodeId, up: writeData.up, down: writeData.down }
      })
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
        create: { xrayUuid: uuid, subscriptionId: writeData.subId, nodeId: writeData.nodeId, up: writeData.up, down: writeData.down }
      }),
      db.uuidTrafficHistory.create({
        data: { xrayUuid: uuid, subscriptionId: writeData.subId, nodeId: writeData.nodeId, up: writeData.up, down: writeData.down }
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

  const subs = await db.subscription.findMany({ 
    select: { id: true, traffic: { select: { up: true, down: true } } } 
  });
  
  for (const sub of subs) {
    const getSum = async (since: Date) => {
      const result = await db.trafficHistory.aggregate({
        where: { subscriptionId: sub.id, timestamp: { gte: since } },
        _sum: { up: true, down: true }
      });
      return { up: BigInt(result._sum.up || 0), down: BigInt(result._sum.down || 0) };
    };

    // Calculate total from all nodes
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
      total: { up: totalUp, down: totalDown }
    };
  }

  const inbounds = await db.subscriptionInbound.findMany({ select: { xrayUuid: true } });
  const histories = await db.uuidHistory.findMany({ select: { xrayUuid: true } });
  const logs = await db.uuidTrafficLog.findMany({ select: { xrayUuid: true, up: true, down: true } });
  
  const uuidSet = new Set<string>([
    ...inbounds.map(i => i.xrayUuid),
    ...histories.map(h => h.xrayUuid),
    ...logs.map(l => l.xrayUuid)
  ]);
  
  const logMap: Record<string, { up: bigint, down: bigint }> = {};
  for (const log of logs) {
    logMap[log.xrayUuid] = { up: log.up, down: log.down };
  }

  for (const xrayUuid of uuidSet) {
    const getSum = async (since: Date) => {
      const result = await db.uuidTrafficHistory.aggregate({
        where: { xrayUuid, timestamp: { gte: since } },
        _sum: { up: true, down: true }
      });
      return { up: BigInt(result._sum.up || 0), down: BigInt(result._sum.down || 0) };
    };

    const total = logMap[xrayUuid] || { up: BigInt(0), down: BigInt(0) };

    cachedUuidAggregates[xrayUuid] = {
      h1: await getSum(h1),
      d1: await getSum(d1),
      mo1: await getSum(mo1),
      total: { up: total.up, down: total.down }
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
    const grouped: Record<string, { up: bigint, down: bigint, ids: string[], nodeId: string }> = {};
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
          data: { subscriptionId: subId, nodeId: data.nodeId, up: data.up, down: data.down, timestamp: new Date(dateStr), isCompressed: true }
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
    const groupedUuid: Record<string, { up: bigint, down: bigint, ids: string[], subId: string, nodeId: string }> = {};
    for (const record of oldUuidRecords) {
      const day = record.timestamp.toISOString().split('T')[0];
      const key = `${record.xrayUuid}_${day}`;
      if (!groupedUuid[key]) groupedUuid[key] = { up: BigInt(0), down: BigInt(0), ids: [], subId: record.subscriptionId, nodeId: record.nodeId };
      groupedUuid[key].up += record.up;
      groupedUuid[key].down += record.down;
      groupedUuid[key].ids.push(record.id);
    }
    for (const key of Object.keys(groupedUuid)) {
      const [uuid, dateStr] = key.split('_');
      const data = groupedUuid[key];
      await db.$transaction([
        db.uuidTrafficHistory.create({
          data: { xrayUuid: uuid, subscriptionId: data.subId, nodeId: data.nodeId, up: data.up, down: data.down, timestamp: new Date(dateStr), isCompressed: true }
        }),
        db.uuidTrafficHistory.deleteMany({ where: { id: { in: data.ids } } })
      ]);
    }
  }
}
