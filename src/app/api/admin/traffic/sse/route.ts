import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const WORKER_URL = process.env.WORKER_URL || 'http://127.0.0.1:8007';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 1. If standalone worker is enabled, proxy SSE stream directly
  if (process.env.EMBEDDED_WORKER !== 'true') {
    try {
      const workerRes = await fetch(`${WORKER_URL}/sse`, {
        headers: { Accept: 'text/event-stream' },
        signal: req.signal,
      });

      if (workerRes.ok && workerRes.body) {
        return new NextResponse(workerRes.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          },
        });
      }
    } catch {
      // Worker offline or unreachable, fall back to embedded / initial snapshot
    }
  }

  // 2. Embedded daemon fallback
  const { trafficEventEmitter, trafficState, uuidTrafficState, nodeStatusState } = await import(
    '@/lib/trafficDaemon'
  );

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        try {
          const payload = `data: ${JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller might be closed
        }
      };

      // Send initial snapshot immediately on connection
      send({
        subscriptions: trafficState,
        uuids: uuidTrafficState,
        nodes: nodeStatusState,
        timestamp: Date.now(),
      });

      const onUpdate = (data: any) => {
        send(data);
      };

      trafficEventEmitter.on('update', onUpdate);

      req.signal.addEventListener('abort', () => {
        trafficEventEmitter.off('update', onUpdate);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
