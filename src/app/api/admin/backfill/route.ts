import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const inbounds = await db.subscriptionInbound.findMany();
    const expiring = await db.expiringUuid.findMany();

    let count = 0;

    for (const inbound of inbounds) {
      const exists = await db.uuidHistory.findFirst({
        where: { xrayUuid: inbound.xrayUuid }
      });
      if (!exists) {
        await db.uuidHistory.create({
          data: {
            subscriptionId: inbound.subscriptionId,
            xrayUuid: inbound.xrayUuid,
            inboundTag: inbound.inboundTag,
            createdAt: new Date(),
          }
        });
        count++;
      }
    }

    for (const exp of expiring) {
      const exists = await db.uuidHistory.findFirst({
        where: { xrayUuid: exp.xrayUuid }
      });
      if (!exists) {
        await db.uuidHistory.create({
          data: {
            subscriptionId: exp.subscriptionId,
            xrayUuid: exp.xrayUuid,
            inboundTag: exp.inboundTag,
            createdAt: new Date(exp.expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000), // guess creation
          }
        });
        count++;
      }
    }

    return new NextResponse(`Backfilled ${count} UUIDs into history`, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return new NextResponse(error.message, { status: 500 });
  }
}
