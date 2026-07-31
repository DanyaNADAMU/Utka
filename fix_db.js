const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fixing DB...");
  // We can't use PrismaClient to add columns, we must use raw SQL
  await prisma.$executeRawUnsafe(`ALTER TABLE "Node" ADD COLUMN IF NOT EXISTS "adminUuid" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Node" ADD COLUMN IF NOT EXISTS "apiToken" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';`);
  
  // For nodeId in SubscriptionInbound and UuidHistory, they need a valid Node ID.
  // Let's get the first Node ID.
  const nodes = await prisma.$queryRawUnsafe(`SELECT id FROM "Node" LIMIT 1;`);
  if (nodes.length > 0) {
    const nodeId = nodes[0].id;
    await prisma.$executeRawUnsafe(`ALTER TABLE "SubscriptionInbound" ADD COLUMN IF NOT EXISTS "nodeId" TEXT NOT NULL DEFAULT '${nodeId}';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "UuidHistory" ADD COLUMN IF NOT EXISTS "nodeId" TEXT NOT NULL DEFAULT '${nodeId}';`);
  }
  console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());
