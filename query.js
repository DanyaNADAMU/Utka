const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const node = await prisma.node.findFirst({ where: { isActive: true } });
  console.log("DB value:");
  console.log(node.xrayConfig);
  console.log("typeof:");
  console.log(typeof node.xrayConfig);
}
main();
