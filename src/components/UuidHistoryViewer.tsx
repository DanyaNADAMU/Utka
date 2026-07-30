import React from 'react';
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { formatDateTime } from '@/lib/formatDate';
import CopyButton from "./CopyButton";

interface UuidHistoryItem {
  id: string;
  inboundTag: string;
  xrayUuid: string;
  createdAt: Date;
  status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  expiresAt?: Date | null;
}

export default async function UuidHistoryViewer({ history }: { history: UuidHistoryItem[] }) {
  const dict = await getDictionary();
  const locale = await getLocale();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-200">{dict.admin.users.profile.uuid_history_title}</h2>
      
      {history.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
          <p className="text-slate-400">{dict.admin.users.profile.uuid_history_empty}</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800/50">
                <tr>
                  <th className="px-6 py-4">{dict.admin.users.profile.created}</th>
                  <th className="px-6 py-4">{dict.admin.users.profile.inbound_tag}</th>
                  <th className="px-6 py-4">{dict.admin.users.profile.uuid}</th>
                  <th className="px-6 py-4">{dict.admin.users.profile.status || 'Status'}</th>
                  <th className="px-6 py-4">{dict.admin.users.profile.expires_at || 'Expires At'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-sans">{formatDateTime(item.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-800 text-emerald-400 px-2 py-1 rounded text-xs">
                        {item.inboundTag}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {item.xrayUuid}
                        </code>
                        <CopyButton text={item.xrayUuid} iconOnly={true} label={dict.common.copied} />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-sans">
                      {item.status === 'ACTIVE' && (
                        <span className="bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded text-xs">
                          {dict.admin.users.profile.active || 'Active'}
                        </span>
                      )}
                      {item.status === 'EXPIRING' && (
                        <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-2 py-1 rounded text-xs">
                          {dict.admin.users.profile.expiring || 'Expiring'}
                        </span>
                      )}
                      {item.status === 'EXPIRED' && (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded text-xs">
                          {dict.admin.users.profile.expired || 'Expired'}
                        </span>
                      )}
                      {!item.status && <span className="text-slate-500">-</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-sans">
                      {item.status === 'ACTIVE' ? (
                        <span className="text-slate-500">-</span>
                      ) : item.expiresAt ? (
                        formatDateTime(item.expiresAt)
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
