require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const nodes = await prisma.node.findMany();
  console.log(JSON.stringify(nodes, null, 2));
}
main().finally(() => prisma.$disconnect());
