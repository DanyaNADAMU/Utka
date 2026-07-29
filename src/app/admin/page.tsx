import db from '@/lib/db';
import AdminDashboardClient from '@/components/AdminDashboardClient';

export default async function AdminDashboardPage() {
  const totalUsers = await db.user.count({ where: { role: 'USER' } });
  const totalSubs = await db.subscription.count();
  
  // NadamuDash has a single Xray node for now (or multiple if configured in DB in the future, let's hardcode 1 for now or count if we have a nodes table)
  const totalNodes = 1;

  return (
    <AdminDashboardClient 
      totalUsers={totalUsers} 
      totalSubs={totalSubs} 
      totalNodes={totalNodes}
    />
  );
}
