import { NextResponse } from 'next/server';
import { trafficEventEmitter, trafficState, uuidTrafficState, nodeStatusState } from '@/lib/trafficDaemon';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        try {
          const payload = `data: ${JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          // Controller might be closed
        }
      };

      // Send initial snapshot immediately on connection
      send({
        subscriptions: trafficState,
        uuids: uuidTrafficState,
        nodes: nodeStatusState,
        timestamp: Date.now()
      });

      const onUpdate = (data: any) => {
        send(data);
      };

      trafficEventEmitter.on('update', onUpdate);

      req.signal.addEventListener('abort', () => {
        trafficEventEmitter.off('update', onUpdate);
        try {
          controller.close();
        } catch (e) {}
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
