'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';
import CopyButton from './CopyButton';

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

interface TrafficState {
  speedUp: string;
  speedDown: string;
  last5sUp: string;
  last5sDown: string;
  last1mUp: string;
  last1mDown: string;
  last1hUp: string;
  last1hDown: string;
  last1moUp: string;
  last1moDown: string;
  totalUp: string;
  totalDown: string;
}

import { useTrafficStream } from '@/components/TrafficStreamContext';

export default function AdminUsersTable({ subscriptions, trafficState: initialTrafficState }: { subscriptions: any[], trafficState: Record<string, TrafficState> }) {
  const dict = useTranslation();
  const router = useRouter();
  const { trafficData } = useTrafficStream();
  const [trafficState, setTrafficState] = useState<Record<string, any>>(initialTrafficState || {});

  useEffect(() => {
    if (trafficData.subscriptions && Object.keys(trafficData.subscriptions).length > 0) {
      setTrafficState(prev => ({ ...prev, ...trafficData.subscriptions }));
    }
  }, [trafficData]);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-slate-800">{dict.admin.users.table.user}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800">{dict.admin.users.table.token}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-emerald-400">{dict.admin.users.table.speed || 'Speed'}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-cyan-400">{dict.admin.users.table.last_1h || '1 Hour Traffic'}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-slate-300">{dict.admin.users.table.all_time || 'All Time Traffic'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {subscriptions.map((sub) => {
                const stat = trafficState[sub.id] || {
                  speedUp: '0', speedDown: '0',
                  last5sUp: '0', last5sDown: '0',
                  last1mUp: '0', last1mDown: '0',
                  last1hUp: '0', last1hDown: '0',
                  last1moUp: '0', last1moDown: '0',
                  totalUp: '0', totalDown: '0',
                };
                
                const hourTotal = Number(stat.last1hDown) + Number(stat.last1hUp);
                const allTimeTotal = Number(stat.totalDown) + Number(stat.totalUp);
                const speedTotal = Number(stat.speedDown) + Number(stat.speedUp);

                return (
                  <React.Fragment key={sub.id}>
                    <tr 
                      onClick={() => router.push(`/admin/users/${sub.id}`)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{sub.user?.email || dict.admin.users.profile.unknown}</span>
                          <span className="text-xs text-slate-500 font-mono mt-1">{sub.name || dict.admin.users.profile.sub_default}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {sub.token.slice(0, 4)}...{sub.token.slice(-4)}
                          </code>
                          <div onClick={(e) => e.stopPropagation()}>
                            <CopyButton text={sub.subLink} iconOnly={true} label={dict.common.copied} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400/90 font-medium">
                        {formatSpeed(speedTotal)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-cyan-400/90 font-medium">
                        {formatBytes(hourTotal)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-300 font-medium">
                        {formatBytes(allTimeTotal)}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
