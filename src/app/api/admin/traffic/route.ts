import { NextResponse } from 'next/server';
import { trafficState } from '@/lib/trafficDaemon';

export const dynamic = 'force-dynamic';

export async function GET() {
  const serialized = JSON.stringify(trafficState, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  return new NextResponse(serialized, {
    headers: { 'Content-Type': 'application/json' },
  });
}
