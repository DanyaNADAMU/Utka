import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const res = await db.node.updateMany({
      where: { name: 'Master Server' },
      data: { name: 'Master' },
    });
    return NextResponse.json({ success: true, count: res.count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
