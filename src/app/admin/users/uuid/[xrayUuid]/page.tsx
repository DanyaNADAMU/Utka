import { formatDateTime } from "@/lib/formatDate";
import db from "@/lib/db";
import { getDictionary } from "@/i18n/dictionaries";
import { notFound } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import SingleUuidTrafficViewer from "@/components/SingleUuidTrafficViewer";
import { fetchTrafficState } from "@/lib/trafficClient";

export default async function UuidDetailPage({ params }: { params: Promise<{ xrayUuid: string }> }) {
  const dict = await getDictionary();
  const { xrayUuid } = await params;

  // Find the uuid in history or in active inbounds
  const uuidHistoryItem = await db.uuidHistory.findFirst({
    where: { xrayUuid },
    include: { subscription: { include: { user: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const activeInbound = await db.subscriptionInbound.findFirst({
    where: { xrayUuid },
    include: { subscription: { include: { user: true } } }
  });

  const expiringItem = await db.expiringUuid.findFirst({
    where: { xrayUuid }
  });

  if (!uuidHistoryItem && !activeInbound && !expiringItem) {
    notFound();
  }

  // Aggregate info
  let subscription: any = activeInbound?.subscription || uuidHistoryItem?.subscription;
  
  if (!subscription && expiringItem) {
    subscription = await db.subscription.findUnique({
      where: { id: expiringItem.subscriptionId },
      include: { user: true }
    });
  }

  let status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' = 'EXPIRED';
  let expiresAt: Date | null = null;
  const inboundTag = activeInbound?.inboundTag || uuidHistoryItem?.inboundTag || expiringItem?.inboundTag || 'unknown';

  if (activeInbound) {
    status = 'ACTIVE';
  } else if (expiringItem) {
    if (expiringItem.expiresAt > new Date()) {
      status = 'EXPIRING';
    } else {
      status = 'EXPIRED';
    }
    expiresAt = expiringItem.expiresAt;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {subscription && (
          <Link href={`/admin/users/${subscription.id}`} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        )}
        <h1 className="text-2xl font-bold text-white">UUID Details</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4">{dict.admin.users.profile.info}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.uuid}</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  {xrayUuid}
                </code>
                <CopyButton text={xrayUuid} iconOnly={true} label={dict.common.copied} />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.inbound_tag}</p>
              <span className="bg-slate-800 text-emerald-400 px-2 py-1 rounded text-sm">
                {inboundTag}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.status || 'Status'}</p>
              {status === 'ACTIVE' && (
                <span className="bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded text-sm">
                  {dict.admin.users.profile.active || 'Active'}
                </span>
              )}
              {status === 'EXPIRING' && (
                <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded text-sm">
                  {dict.admin.users.profile.expiring || 'Expiring'} (until {formatDateTime(expiresAt!)})
                </span>
              )}
              {status === 'EXPIRED' && (
                <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded text-sm">
                  {dict.admin.users.profile.expired || 'Expired'}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">User Email</p>
              <p className="font-medium text-slate-200">{subscription?.user?.email || dict.admin.users.profile.unknown}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.sub_name}</p>
              <p className="font-medium text-slate-200">{subscription?.name || dict.admin.users.profile.sub_default}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">{dict.admin.users.profile.sub_id}</p>
              {subscription ? (
                <Link href={`/admin/users/${subscription.id}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                  <code className="text-sm bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {subscription.id}
                  </code>
                </Link>
              ) : (
                <p className="font-medium text-slate-200">N/A</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {await (async () => {
        const trafficData = await fetchTrafficState();
        const state = trafficData.uuids[xrayUuid] || {
          speedUp: 0, speedDown: 0,
          last5sUp: 0, last5sDown: 0,
          last1mUp: 0, last1mDown: 0,
          last1hUp: 0, last1hDown: 0,
          last1moUp: 0, last1moDown: 0,
          totalUp: 0, totalDown: 0,
        };
        return <SingleUuidTrafficViewer xrayUuid={xrayUuid} trafficState={state as any} />;
      })()}
      
    </div>
  );
}
