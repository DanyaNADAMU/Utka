import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log("Starting UuidHistory backfill...");

  const inbounds = await db.subscriptionInbound.findMany();
  for (const inbound of inbounds) {
    const exists = await db.uuidHistory.findFirst({
      where: { xrayUuid: inbound.xrayUuid }
    });
    
    if (!exists) {
      await db.uuidHistory.create({
        data: {
          subscriptionId: inbound.subscriptionId,
          nodeId: inbound.nodeId,
          inboundTag: inbound.inboundTag,
          xrayUuid: inbound.xrayUuid
        }
      });
      console.log(`Inserted active UUID ${inbound.xrayUuid} for subscription ${inbound.subscriptionId}`);
    }
  }

  const expUuids = await db.expiringUuid.findMany();
  for (const exp of expUuids) {
    const exists = await db.uuidHistory.findFirst({
      where: { xrayUuid: exp.xrayUuid }
    });
    
    if (!exists) {
      await db.uuidHistory.create({
        data: {
          subscriptionId: exp.subscriptionId,
          nodeId: exp.nodeId,
          inboundTag: exp.inboundTag,
          xrayUuid: exp.xrayUuid
        }
      });
      console.log(`Inserted expiring UUID ${exp.xrayUuid} for subscription ${exp.subscriptionId}`);
    }
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
