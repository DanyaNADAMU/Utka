import db from './src/lib/db';

async function main() {
  console.log('Wiping TrafficLog...');
  await db.trafficLog.deleteMany();
  console.log('Wiping TrafficHistory...');
  await db.trafficHistory.deleteMany();
  console.log('Wiping UuidHistory...');
  await db.uuidHistory.deleteMany();
  
  // Also wipe UuidTrafficLog / UuidTrafficHistory if any exist yet
  console.log('Wiping UuidTrafficLog...');
  await db.uuidTrafficLog.deleteMany();
  console.log('Wiping UuidTrafficHistory...');
  await db.uuidTrafficHistory.deleteMany();
  
  console.log('Done wiping data.');
}

main().catch(console.error).finally(() => process.exit(0));
