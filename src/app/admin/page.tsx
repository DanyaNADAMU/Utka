import db from '@/lib/db';
import AdminDashboardClient from '@/components/AdminDashboardClient';
import { trafficState } from '@/lib/trafficDaemon';

export default async function AdminDashboardPage() {
  const totalUsers = await db.user.count({ where: { role: 'USER' } });
  const totalSubs = await db.subscription.count();
  
  // NadamuDash has a single Xray node for now
  const totalNodes = await db.node.count();

  let gt = {
    speedUp: 0, speedDown: 0, 
    last5sUp: 0, last5sDown: 0, 
    last1mUp: 0, last1mDown: 0, 
    last1hUp: 0, last1hDown: 0, 
    last1moUp: 0, last1moDown: 0, 
    totalUp: 0, totalDown: 0 
  };

  Object.values(trafficState || {}).forEach((t: any) => {
    gt.speedUp += Number(t.speedUp || 0);
    gt.speedDown += Number(t.speedDown || 0);
    gt.last5sUp += Number(t.last5sUp || 0);
    gt.last5sDown += Number(t.last5sDown || 0);
    gt.last1mUp += Number(t.last1mUp || 0);
    gt.last1mDown += Number(t.last1mDown || 0);
    gt.last1hUp += Number(t.last1hUp || 0);
    gt.last1hDown += Number(t.last1hDown || 0);
    gt.last1moUp += Number(t.last1moUp || 0);
    gt.last1moDown += Number(t.last1moDown || 0);
    gt.totalUp += Number(t.totalUp || 0);
    gt.totalDown += Number(t.totalDown || 0);
  });

  return (
    <AdminDashboardClient 
      totalUsers={totalUsers} 
      totalSubs={totalSubs} 
      totalNodes={totalNodes}
      globalTraffic={gt}
      systemStats={null}
    />
  );
}
