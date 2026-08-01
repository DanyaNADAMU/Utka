const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sub = await prisma.subscription.findFirst();
  if (sub) {
    console.log("Token:", sub.token);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
