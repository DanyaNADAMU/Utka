import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log("Wiping all traffic history...");
    await db.uuidTrafficHistory.deleteMany();
    console.log("Deleted all UuidTrafficHistory");
    await db.uuidTrafficLog.deleteMany();
    console.log("Deleted all UuidTrafficLog");
    await db.trafficHistory.deleteMany();
    console.log("Deleted all TrafficHistory");
    await db.trafficLog.deleteMany();
    console.log("Deleted all TrafficLog");
    await db.uuidHistory.deleteMany();
    console.log("Deleted all UuidHistory");
    return new NextResponse('Wiped successfully', { status: 200 });
  } catch (error: any) {
    console.error(error);
    return new NextResponse(error.message, { status: 500 });
  }
}
