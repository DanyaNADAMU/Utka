'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';

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

export default function UserTrafficViewer({ subId }: { subId: string }) {
  const [traffic, setTraffic] = useState<Record<string, TrafficState>>({});
  const [progress, setProgress] = useState(0);
  const dict = useTranslation();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isFetching = false;
    
    const fetchTraffic = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const res = await fetch('/api/admin/traffic');
        const data = await res.json();
        setTraffic(data);
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
    
    let animationFrame: number;
    const animate = () => {
      const msInCycle = Date.now() % 5000;
      setProgress((msInCycle / 5000) * 100);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const stat = traffic[subId] || {
    speedUp: '0', speedDown: '0',
    last5sUp: '0', last5sDown: '0',
    last1mUp: '0', last1mDown: '0',
    last1hUp: '0', last1hDown: '0',
    last1moUp: '0', last1moDown: '0',
    totalUp: '0', totalDown: '0',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-200">{dict.admin.users.profile.detailed_stats}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-400">{dict.admin.users.profile.auto_update}</span>
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left">{dict.admin.dash.direction}</th>
                <th className="px-6 py-4">{dict.admin.users.table.speed}</th>
                <th className="px-6 py-4">{dict.admin.users.table.last_5s}</th>
                <th className="px-6 py-4">{dict.admin.users.table.last_1m}</th>
                <th className="px-6 py-4">{dict.admin.users.table.last_1h}</th>
                <th className="px-6 py-4">{dict.admin.users.table.last_1mo}</th>
                <th className="px-6 py-4">{dict.admin.users.table.all_time}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-left text-emerald-400 font-sans font-medium">{dict.admin.users.table.downloaded} ↓</td>
                <td className="px-6 py-4 text-emerald-400/80">{formatSpeed(stat.speedDown)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last5sDown)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last1mDown)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last1hDown)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last1moDown)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.totalDown)}</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-left text-cyan-400 font-sans font-medium">{dict.admin.users.table.uploaded} ↑</td>
                <td className="px-6 py-4 text-cyan-400/80">{formatSpeed(stat.speedUp)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last5sUp)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last1mUp)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last1hUp)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.last1moUp)}</td>
                <td className="px-6 py-4 text-slate-400">{formatBytes(stat.totalUp)}</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors font-medium bg-slate-900/30">
                <td className="px-6 py-4 text-left text-purple-400 font-sans">{dict.admin.users.table.sum}</td>
                <td className="px-6 py-4 text-purple-400/80">{formatSpeed(Number(stat.speedDown) + Number(stat.speedUp))}</td>
                <td className="px-6 py-4 text-slate-300">{formatBytes(Number(stat.last5sDown) + Number(stat.last5sUp))}</td>
                <td className="px-6 py-4 text-slate-300">{formatBytes(Number(stat.last1mDown) + Number(stat.last1mUp))}</td>
                <td className="px-6 py-4 text-slate-300">{formatBytes(Number(stat.last1hDown) + Number(stat.last1hUp))}</td>
                <td className="px-6 py-4 text-slate-300">{formatBytes(Number(stat.last1moDown) + Number(stat.last1moUp))}</td>
                <td className="px-6 py-4 text-slate-300">{formatBytes(Number(stat.totalDown) + Number(stat.totalUp))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
