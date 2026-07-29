const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  await prisma.node.updateMany({
    data: {
      address: "81.30.105.65",
      port: 443
    }
  });
  console.log("Updated nodes!");
}
run();
