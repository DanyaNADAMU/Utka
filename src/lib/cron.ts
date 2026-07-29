import db from "@/lib/db";
import { queryUserStats } from "@/lib/xray";

export async function syncTraffic() {
  try {
    const subscriptions = await db.subscription.findMany();
    
    for (const sub of subscriptions) {
      // Query with reset=true to clear Xray's counter and retrieve the delta
      const stats = await queryUserStats(sub.id, true);
      
      if (stats.up > BigInt(0) || stats.down > BigInt(0)) {
        await db.trafficLog.upsert({
          where: { subscriptionId: sub.id },
          update: { 
            up: { increment: stats.up }, 
            down: { increment: stats.down },
            lastUpdate: new Date()
          },
          create: { 
            subscriptionId: sub.id, 
            up: stats.up, 
            down: stats.down 
          }
        });
      }
    }
  } catch (error) {
    console.error("[Cron] Failed to sync traffic:", error);
  }
}
