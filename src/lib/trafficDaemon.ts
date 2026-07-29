import db from "@/lib/db";
import { queryUserStats } from "@/lib/xray";

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

const uncommittedTraffic: Record<string, { up: bigint, down: bigint }> = {};
const cachedAggregates: Record<string, { h1: {up: bigint, down: bigint}, d1: {up: bigint, down: bigint}, mo1: {up: bigint, down: bigint}, total: {up: bigint, down: bigint} }> = {};

export const trafficState: Record<string, TrafficState> = {};

let isRunning = false;
let dbSyncRunning = false;

export function startDaemon() {
  if (isRunning) return;
  isRunning = true;
  console.log("[Daemon] Starting traffic daemon...");
  
  // Align to next 5s boundary
  const now = Date.now();
  const delay = 5000 - (now % 5000);
  
  // Pre-calculate aggregates initially
  calculateAggregations().catch(console.error);
  
  setTimeout(() => {
    tick();
    setInterval(tick, 5000);
  }, delay);
}

async function tick() {
  try {
    const now = new Date();
    const seconds = now.getSeconds();
    
    // Fetch live stats for all active subs
    const subscriptions = await db.subscription.findMany({ select: { id: true } });
    
    // We can query Xray in parallel
    const statsPromises = subscriptions.map(sub => queryUserStats(sub.id, true));
    const statsResults = await Promise.all(statsPromises);
    
    for (let i = 0; i < subscriptions.length; i++) {
      const subId = subscriptions[i].id;
      const live = statsResults[i];
      
      if (!uncommittedTraffic[subId]) uncommittedTraffic[subId] = { up: BigInt(0), down: BigInt(0) };
      uncommittedTraffic[subId].up += live.up;
      uncommittedTraffic[subId].down += live.down;
      
      if (!cachedAggregates[subId]) {
         cachedAggregates[subId] = { h1: {up: BigInt(0), down: BigInt(0)}, d1: {up: BigInt(0), down: BigInt(0)}, mo1: {up: BigInt(0), down: BigInt(0)}, total: {up: BigInt(0), down: BigInt(0)} };
      }
      const agg = cachedAggregates[subId];
      
      trafficState[subId] = {
        speedUp: live.up / BigInt(5),
        speedDown: live.down / BigInt(5),
        last5sUp: live.up,
        last5sDown: live.down,
        last1mUp: uncommittedTraffic[subId].up,
        last1mDown: uncommittedTraffic[subId].down,
        last1hUp: agg.h1.up + uncommittedTraffic[subId].up,
        last1hDown: agg.h1.down + uncommittedTraffic[subId].down,
        last1dUp: agg.d1.up + uncommittedTraffic[subId].up,
        last1dDown: agg.d1.down + uncommittedTraffic[subId].down,
        last1moUp: agg.mo1.up + uncommittedTraffic[subId].up,
        last1moDown: agg.mo1.down + uncommittedTraffic[subId].down,
        totalUp: agg.total.up + uncommittedTraffic[subId].up,
        totalDown: agg.total.down + uncommittedTraffic[subId].down,
      };
    }
    
    // Every minute (at 00s), flush to DB
    if (seconds < 5 && !dbSyncRunning) {
      dbSyncRunning = true;
      syncToDbAndAggregate().finally(() => { dbSyncRunning = false; });
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
}

async function compressHistory() {
  console.log("[Daemon] Compressing old traffic history...");
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
  const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const oldRecords = await db.trafficHistory.findMany({
    where: { timestamp: { lt: startOfLastWeek }, isCompressed: false },
    orderBy: { timestamp: 'asc' }
  });
  
  if (oldRecords.length === 0) return;
  
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
        data: {
          subscriptionId: subId,
          up: data.up,
          down: data.down,
          timestamp: new Date(dateStr),
          isCompressed: true
        }
      }),
      db.trafficHistory.deleteMany({
        where: { id: { in: data.ids } }
      })
    ]);
  }
}
