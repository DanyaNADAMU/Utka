import { NextResponse } from 'next/server';
import os from 'os';
import db from '@/lib/db';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. System Resources
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;
    
    const cpus = os.cpus();
    const loadAvg = os.loadavg()[0]; // 1 minute load average
    const cpuUsagePercent = Math.min((loadAvg / cpus.length) * 100, 100);

    // 2. Traffic History (Last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const history = await db.trafficHistory.groupBy({
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

    // Group by day for the chart
    const dailyData: Record<string, { up: bigint, down: bigint }> = {};
    
    // Initialize last 14 days with 0
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { up: BigInt(0), down: BigInt(0) };
    }

    // Populate actual data
    for (const record of history) {
      const dateStr = record.timestamp.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].up += record._sum.up || BigInt(0);
        dailyData[dateStr].down += record._sum.down || BigInt(0);
      }
    }

    const chartData = Object.entries(dailyData).map(([date, data]) => ({
      date,
      up: data.up.toString(), // Convert BigInt to string for JSON
      down: data.down.toString()
    }));

    return NextResponse.json({
      cpu: cpuUsagePercent,
      ram: memUsagePercent,
      history: chartData
    });
  } catch (error: any) {
    console.error('System API Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
