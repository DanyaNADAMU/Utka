import { NextResponse } from 'next/server';
import { fetchTrafficState } from '@/lib/trafficClient';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const state = await fetchTrafficState();
  const serialized = JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  return new NextResponse(serialized, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    },
  });
}
