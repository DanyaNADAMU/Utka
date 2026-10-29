import { NextResponse } from 'next/server';
import { getConfigIniContent } from '@/lib/clashConfig';

export async function GET() {
  const content = await getConfigIniContent();
  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
