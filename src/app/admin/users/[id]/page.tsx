import { formatDateTime } from "@/lib/formatDate";
import db from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { notFound } from "next/navigation";
import Link from "next/link";
import UserTrafficViewer from "@/components/UserTrafficViewer";
import CopyButton from "@/components/CopyButton";
import UuidHistoryViewer from "@/components/UuidHistoryViewer";
import { trafficState } from "@/lib/trafficDaemon";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const dict = await getDictionary();
  const locale = await getLocale();
  const settings = await getSettings();
  const authUrl = process.env.AUTH_URL || 'https://nada.mu';
  const { id } = await params;

  const sub = await db.subscription.findUnique({
    where: { id },
    include: { 
      user: true,
      uuidHistory: { orderBy: { createdAt: 'desc' } },
      inbounds: true
    }
  });

  const expiringUuids = await db.expiringUuid.findMany({
    where: { subscriptionId: id }
  });

  if (!sub) {
    notFound();
  }

  const subPath = settings.SUB_PATH.replace('[token]', sub.token);
  const safeSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
  const subLink = `${authUrl}${safeSubPath}`;

  const activeExpiringCount = expiringUuids.filter(e => e.expiresAt > new Date()).length;
  const activeUuidsCount = sub.inbounds.length + activeExpiringCount;

  const enrichedHistory = sub.uuidHistory.map(h => {
    const isActive = sub.inbounds.some(i => i.xrayUuid === h.xrayUuid);
    const expiring = expiringUuids.find(e => e.xrayUuid === h.xrayUuid);
    
    let status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' = 'EXPIRED';
    let expiresAt: Date | null = null;
    
    if (isActive) {
      status = 'ACTIVE';
    } else if (expiring) {
      if (expiring.expiresAt > new Date()) {
        status = 'EXPIRING';
      } else {
        status = 'EXPIRED';
      }
      expiresAt = expiring.expiresAt;
    }
    
    return {
      ...h,
      status,
      expiresAt
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-white">{dict.admin.users.profile.title}: {sub.user?.email || dict.admin.users.profile.unknown}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">{dict.admin.users.profile.info}</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.sub_name}</p>
              <p className="font-medium text-slate-200">{sub.name || dict.admin.users.profile.sub_default}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.token}</p>
              <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {sub.token}
              </code>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.sub_link}</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800 truncate max-w-[200px] md:max-w-xs">
                  {subLink}
                </code>
                <CopyButton text={subLink} iconOnly={true} label={dict.common.copied} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-200 mb-4">{dict.admin.users.profile.system_data}</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.sub_id}</p>
              <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {sub.id}
              </code>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.created}</p>
              <p className="font-medium text-slate-200">{formatDateTime(sub.createdAt)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">{dict.admin.users.profile.updated}</p>
              <p className="font-medium text-slate-200">{formatDateTime(sub.updatedAt)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">{dict.admin.users.profile.active_uuids || 'Active UUIDs'}</p>
              <p className="font-medium text-emerald-400">{activeUuidsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {(() => {
        const myTrafficState = trafficState[sub.id] || {
          speedUp: 0, speedDown: 0,
          last5sUp: 0, last5sDown: 0,
          last1mUp: 0, last1mDown: 0,
          last1hUp: 0, last1hDown: 0,
          last1moUp: 0, last1moDown: 0,
          totalUp: 0, totalDown: 0,
        };
        return <UserTrafficViewer subId={sub.id} trafficState={myTrafficState as any} />;
      })()}

      <UuidHistoryViewer history={enrichedHistory} />
    </div>
  );
}
