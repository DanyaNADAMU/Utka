import { NextResponse } from 'next/server';
import fs from 'fs';
import db from '@/lib/db';
import { checkWorkerHealth } from '@/lib/trafficClient';
import { checkSubHealth } from '@/lib/subClient';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'error' = 'connected';
  let dbError: string | null = null;
  let dbLatency = 0;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : String(err);
  }

  // Check Xray socket
  const socketPath = process.env.XRAY_SOCKET_PATH || '/app/xray/api.sock';
  const cleanSocketPath = socketPath.replace(/^unix:\/\//, '');
  let socketExists = false;
  try {
    socketExists = fs.existsSync(cleanSocketPath);
  } catch {
    socketExists = false;
  }

  // Check Worker health
  const workerInfo = await checkWorkerHealth();

  // Check Sub service health
  const subInfo = await checkSubHealth();

  const isHealthy = dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? (socketExists ? 'ok' : 'degraded') : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          ...(dbError ? { error: dbError } : {}),
        },
        xraySocket: {
          path: cleanSocketPath,
          status: socketExists ? 'available' : 'unavailable',
        },
        worker: workerInfo || { status: 'unknown' },
        sub: subInfo || { status: 'unknown' },
      },
    },
    { status: statusCode }
  );
}
