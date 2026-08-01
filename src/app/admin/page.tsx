import os from 'os';
import db from '@/lib/db';
import AdminDashboardClient from '@/components/AdminDashboardClient';
import { trafficState } from '@/lib/trafficDaemon';

export default async function AdminDashboardPage() {
  const totalUsers = await db.user.count({ where: { role: 'USER' } });
  const totalSubs = await db.subscription.count();
  const totalNodes = await db.node.count();

  // Compute System Resources (CPU & RAM)
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);
  
  const cpus = os.cpus();
  const loadAvg = os.loadavg()[0]; // 1 minute load average
  const cpuUsagePercent = Math.min(Math.round((loadAvg / Math.max(cpus.length, 1)) * 100), 100);

  // Compute Traffic History (Last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const historyRecords = await db.trafficHistory.groupBy({
    by: ['timestamp'],
    where: {
      timestamp: { gte: fourteenDaysAgo }
    },
    _sum: {
      up: true,
      down: true
    },
    orderBy: {
      timestamp: 'asc'
    }
  });

  const dailyData: Record<string, { up: bigint, down: bigint }> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyData[dateStr] = { up: BigInt(0), down: BigInt(0) };
  }

  for (const record of historyRecords) {
    const dateStr = record.timestamp.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].up += record._sum.up || BigInt(0);
      dailyData[dateStr].down += record._sum.down || BigInt(0);
    }
  }

  const chartData = Object.entries(dailyData).map(([date, data]) => ({
    date,
    up: data.up.toString(),
    down: data.down.toString()
  }));

  const systemStats = {
    cpu: cpuUsagePercent,
    ram: memUsagePercent,
    history: chartData
  };

  let gt = {
    speedUp: 0, speedDown: 0, 
    last5sUp: 0, last5sDown: 0, 
    last1mUp: 0, last1mDown: 0, 
    last1hUp: 0, last1hDown: 0, 
    last1moUp: 0, last1moDown: 0, 
    totalUp: 0, totalDown: 0 
  };

  Object.values(trafficState || {}).forEach((t: any) => {
    gt.speedUp += Number(t.speedUp || 0);
    gt.speedDown += Number(t.speedDown || 0);
    gt.last5sUp += Number(t.last5sUp || 0);
    gt.last5sDown += Number(t.last5sDown || 0);
    gt.last1mUp += Number(t.last1mUp || 0);
    gt.last1mDown += Number(t.last1mDown || 0);
    gt.last1hUp += Number(t.last1hUp || 0);
    gt.last1hDown += Number(t.last1hDown || 0);
    gt.last1moUp += Number(t.last1moUp || 0);
    gt.last1moDown += Number(t.last1moDown || 0);
    gt.totalUp += Number(t.totalUp || 0);
    gt.totalDown += Number(t.totalDown || 0);
  });

  return (
    <AdminDashboardClient 
      totalUsers={totalUsers} 
      totalSubs={totalSubs} 
      totalNodes={totalNodes}
      globalTraffic={gt}
      systemStats={systemStats}
    />
  );
}
