'use client';

import React from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';
import { Network, ArrowDown, ArrowUp, Activity } from 'lucide-react';

export const formatBytes = (bytes: string | number) => {
  const b = Number(bytes);
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatSpeed = (bytesPerSec: string | number) => {
  return formatBytes(bytesPerSec) + '/s';
};

export interface TrafficStats {
  speedUp: number;
  speedDown: number;
  last5sUp: number;
  last5sDown: number;
  last1mUp: number;
  last1mDown: number;
  last1hUp: number;
  last1hDown: number;
  last1moUp: number;
  last1moDown: number;
  totalUp: number;
  totalDown: number;
}

export default function TrafficTableUI({
  title,
  traffic,
  progress
}: {
  title: string;
  traffic: TrafficStats;
  progress: number;
}) {
  const dict = useTranslation();

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center">
          <Network className="w-5 h-5 mr-2 text-blue-400" />
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-400">{dict.admin.users.profile.auto_update || 'Auto-update'}</span>
          <div className="relative w-6 h-6">
            <svg className="w-6 h-6 -rotate-90 transform" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-800" />
              <circle 
                cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="transparent" 
                className="text-emerald-400 transition-all duration-75"
                strokeDasharray={2 * Math.PI * 10}
                strokeDashoffset={2 * Math.PI * 10 * (1 - progress / 100)}
              />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-sm">
              <th className="pb-3 px-4 font-medium">{dict.admin.dash.direction}</th>
              <th className="pb-3 px-4 font-medium">{dict.admin.users.table.speed}</th>
              <th className="pb-3 px-4 font-medium">{dict.admin.users.table.last_5s}</th>
              <th className="pb-3 px-4 font-medium">{dict.admin.users.table.last_1m}</th>
              <th className="pb-3 px-4 font-medium">{dict.admin.users.table.last_1h}</th>
              <th className="pb-3 px-4 font-medium">{dict.admin.users.table.last_1mo}</th>
              <th className="pb-3 px-4 font-medium">{dict.admin.users.table.all_time}</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-300">
            <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              <td className="py-4 px-4 font-medium text-emerald-400 flex items-center">
                <ArrowDown className="w-4 h-4 mr-1" /> {dict.common?.downloaded || dict.admin.users.table.downloaded || 'Download'}
              </td>
              <td className="py-4 px-4">{formatSpeed(traffic.speedDown)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last5sDown)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last1mDown)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last1hDown)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last1moDown)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.totalDown)}</td>
            </tr>
            <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              <td className="py-4 px-4 font-medium text-blue-400 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" /> {dict.common?.uploaded || dict.admin.users.table.uploaded || 'Upload'}
              </td>
              <td className="py-4 px-4">{formatSpeed(traffic.speedUp)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last5sUp)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last1mUp)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last1hUp)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.last1moUp)}</td>
              <td className="py-4 px-4">{formatBytes(traffic.totalUp)}</td>
            </tr>
            <tr className="hover:bg-slate-800/30 transition-colors font-semibold">
              <td className="py-4 px-4 text-purple-400 flex items-center">
                <Activity className="w-4 h-4 mr-1" /> {dict.admin.users.table.sum || 'Sum'}
              </td>
              <td className="py-4 px-4">{formatSpeed(Number(traffic.speedDown) + Number(traffic.speedUp))}</td>
              <td className="py-4 px-4">{formatBytes(Number(traffic.last5sDown) + Number(traffic.last5sUp))}</td>
              <td className="py-4 px-4">{formatBytes(Number(traffic.last1mDown) + Number(traffic.last1mUp))}</td>
              <td className="py-4 px-4">{formatBytes(Number(traffic.last1hDown) + Number(traffic.last1hUp))}</td>
              <td className="py-4 px-4">{formatBytes(Number(traffic.last1moDown) + Number(traffic.last1moUp))}</td>
              <td className="py-4 px-4">{formatBytes(Number(traffic.totalDown) + Number(traffic.totalUp))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
