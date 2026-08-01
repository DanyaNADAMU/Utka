import { NextResponse } from 'next/server';
import { trafficState, uuidTrafficState, nodeStatusState } from '@/lib/trafficDaemon';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const serialized = JSON.stringify(
    { subscriptions: trafficState, uuids: uuidTrafficState, nodes: nodeStatusState }, 
    (key, value) => typeof value === 'bigint' ? value.toString() : value
  );
  return new NextResponse(serialized, {
    headers: { 'Content-Type': 'application/json' },
  });
}
