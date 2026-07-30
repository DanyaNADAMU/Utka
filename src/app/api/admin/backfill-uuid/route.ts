import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'backfill123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inbounds = await prisma.subscriptionInbound.findMany();
    let count = 0;
    for (const inbound of inbounds) {
      const exists = await prisma.uuidHistory.findFirst({
        where: { xrayUuid: inbound.xrayUuid }
      });
      if (!exists) {
        await prisma.uuidHistory.create({
          data: {
            subscriptionId: inbound.subscriptionId,
            inboundTag: inbound.inboundTag,
            xrayUuid: inbound.xrayUuid
          }
        });
        count++;
      }
    }

    const expUuids = await prisma.expiringUuid.findMany();
    for (const exp of expUuids) {
      const exists = await prisma.uuidHistory.findFirst({
        where: { xrayUuid: exp.xrayUuid }
      });
      if (!exists) {
        await prisma.uuidHistory.create({
          data: {
            subscriptionId: exp.subscriptionId,
            inboundTag: exp.inboundTag,
            xrayUuid: exp.xrayUuid
          }
        });
        count++;
      }
    }

    return NextResponse.json({ success: true, inserted: count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
