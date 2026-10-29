import db from "@/lib/db";
import { getSettings } from "@/lib/settings";
import AdminUsersTable from "@/components/AdminUsersTable";
import AddUserModal from "@/components/AddUserModal";
import { getDictionary } from "@/i18n/dictionaries";
import { fetchTrafficState } from "@/lib/trafficClient";

export default async function AdminUsersPage() {
  const dict = await getDictionary();
  const settings = await getSettings();
  const authUrl = process.env.AUTH_URL || 'https://nada.mu';

  // Fetch all subscriptions with user relation
  const subscriptions = await db.subscription.findMany({
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const subs = subscriptions.map((sub) => {
    const subPath = settings.SUB_PATH.replace('[token]', sub.token);
    const safeSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
    const subLink = `${authUrl}${safeSubPath}`;

    return { 
      id: sub.id,
      name: sub.name,
      token: sub.token,
      user: sub.user,
      subLink
    };
  });

  const trafficData = await fetchTrafficState();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-100">{dict.admin.users.title}</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            {dict.admin.users.total_subs}: <span className="font-mono text-emerald-400">{subs.length}</span>
          </div>
          <AddUserModal />
        </div>
      </div>
      
      <AdminUsersTable subscriptions={subs} trafficState={trafficData.subscriptions as any} />
      
    </div>
  );
}
