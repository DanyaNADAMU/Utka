import { queryUserStats } from './src/lib/xray';

async function main() {
  const stats = await queryUserStats("", false);
  console.log(stats);
}
main();
