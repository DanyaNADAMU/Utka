'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';
import { formatDateTime } from '@/lib/formatDate';
import CopyButton from "./CopyButton";
import Link from 'next/link';

interface UuidHistoryItem {
  id: string;
  inboundTag: string;
  xrayUuid: string;
  createdAt: Date;
  status?: 'ACTIVE' | 'EXPIRING' | 'EXPIRED';
  expiresAt?: Date | null;
}

const formatBytes = (bytes: string | number) => {
  const b = Number(bytes);
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSec: string | number) => {
  return formatBytes(bytesPerSec) + '/s';
};

export default function UuidHistoryViewer({ history }: { history: UuidHistoryItem[] }) {
  const dict = useTranslation();
  const [traffic, setTraffic] = useState<Record<string, any>>({});

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isFetching = false;
    
    const fetchTraffic = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const res = await fetch('/api/admin/traffic?t=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        setTraffic(data.uuids || {});
      } catch (err) {
        console.error('Failed to fetch traffic', err);
      } finally {
        isFetching = false;
      }
    };

    const scheduleNextFetch = () => {
      const now = Date.now();
      const delay = 5000 - (now % 5000) + 200;
      
      timeoutId = setTimeout(() => {
        fetchTraffic();
        scheduleNextFetch();
      }, delay);
    };

    fetchTraffic();
    scheduleNextFetch();

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-200">{dict.admin.users.profile.uuid_history_title}</h2>
      
      {history.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
          <p className="text-slate-400">{dict.admin.users.profile.uuid_history_empty || 'No UUID history found.'}</p>
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
                  <th className="px-6 py-4">{dict.admin.users.table?.speed || 'Speed'}</th>
                  <th className="px-6 py-4">{dict.admin.users.table?.last_1h || '1 Hour Traffic'}</th>
                  <th className="px-6 py-4">{dict.admin.users.table?.all_time || 'Total Traffic'}</th>
                  <th className="px-6 py-4">{dict.admin.users.profile.expires_at || 'Expires At'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
                {history.map((item) => {
                  const t = traffic[item.xrayUuid] || {};
                  const speed = Number(t.speedUp || 0) + Number(t.speedDown || 0);
                  const h1 = Number(t.last1hUp || 0) + Number(t.last1hDown || 0);
                  const total = Number(t.totalUp || 0) + Number(t.totalDown || 0);
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-sans">{formatDateTime(item.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-800 text-emerald-400 px-2 py-1 rounded text-xs">
                          {item.inboundTag}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/users/uuid/${item.xrayUuid}`} className="text-blue-400 hover:text-blue-300 hover:underline">
                            <code className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                              {item.xrayUuid}
                            </code>
                          </Link>
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
                      <td className="px-6 py-4">{formatSpeed(speed)}</td>
                      <td className="px-6 py-4">{formatBytes(h1)}</td>
                      <td className="px-6 py-4">{formatBytes(total)}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
