'use client';

import React, { useState, useEffect } from 'react';
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

export default function AdminUsersTable({ subscriptions }: { subscriptions: any[] }) {
  const [traffic, setTraffic] = useState<Record<string, TrafficState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
      // Вычисляем задержку до следующих 00, 05, 10 секунд плюс 200мс,
      // чтобы дать серверному демону гарантированно записать данные в кэш.
      const delay = 5000 - (now % 5000) + 200;
      
      timeoutId = setTimeout(() => {
        fetchTraffic();
        scheduleNextFetch();
      }, delay);
    };

    // Первичный запрос и запуск расписания
    fetchTraffic();
    scheduleNextFetch();
    
    // Анимация таймера, жестко привязанная к часам системы
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

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3 mb-2">
        <span className="text-sm font-medium text-slate-400">Автообновление</span>
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-slate-800">{dict.admin.users.table.user}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800">{dict.admin.users.table.token}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-emerald-400">{dict.common.downloaded}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-cyan-400">{dict.common.uploaded}</th>
                <th className="px-6 py-4 font-medium border-b border-slate-800 text-right text-purple-400">{dict.admin.users.table.traffic_hour}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {subscriptions.map((sub) => {
                const stat = traffic[sub.id] || {
                  speedUp: '0', speedDown: '0',
                  last5sUp: '0', last5sDown: '0',
                  last1mUp: '0', last1mDown: '0',
                  last1hUp: '0', last1hDown: '0',
                  last1moUp: '0', last1moDown: '0',
                  totalUp: '0', totalDown: '0',
                };
                
                const hourTotal = Number(stat.last1hDown) + Number(stat.last1hUp);

                return (
                  <React.Fragment key={sub.id}>
                    <tr 
                      onClick={() => toggleExpand(sub.id)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-200">{sub.user?.email || 'Неизвестно'}</span>
                          <span className="text-xs text-slate-500 font-mono mt-1">{sub.name || 'Default'}</span>
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
                        {formatSpeed(stat.speedDown)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-cyan-400/90 font-medium">
                        {formatSpeed(stat.speedUp)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-purple-400/90 font-medium">
                        {formatBytes(hourTotal)}
                      </td>
                    </tr>
                    
                    {expanded[sub.id] && (
                      <tr className="bg-slate-950/30">
                        <td colSpan={5} className="px-6 py-6 border-b border-slate-800/50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead className="text-slate-500 uppercase font-medium border-b border-slate-800/50">
                                <tr>
                                  <th className="pb-3 text-left w-24">Метрика</th>
                                  <th className="pb-3">{dict.admin.users.table.speed}</th>
                                  <th className="pb-3">{dict.admin.users.table.last_5s}</th>
                                  <th className="pb-3">{dict.admin.users.table.last_1m}</th>
                                  <th className="pb-3">{dict.admin.users.table.last_1h}</th>
                                  <th className="pb-3">{dict.admin.users.table.last_1mo}</th>
                                </tr>
                              </thead>
                              <tbody className="font-mono text-slate-300">
                                <tr className="border-b border-slate-800/30">
                                  <td className="py-3 text-left text-emerald-400 font-sans font-medium">{dict.admin.users.table.downloaded} ↓</td>
                                  <td className="py-3 text-emerald-400/80">{formatSpeed(stat.speedDown)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last5sDown)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last1mDown)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last1hDown)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last1moDown)}</td>
                                </tr>
                                <tr className="border-b border-slate-800/30">
                                  <td className="py-3 text-left text-cyan-400 font-sans font-medium">{dict.admin.users.table.uploaded} ↑</td>
                                  <td className="py-3 text-cyan-400/80">{formatSpeed(stat.speedUp)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last5sUp)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last1mUp)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last1hUp)}</td>
                                  <td className="py-3 text-slate-400">{formatBytes(stat.last1moUp)}</td>
                                </tr>
                                <tr className="font-medium bg-slate-900/30">
                                  <td className="py-3 text-left text-purple-400 font-sans">{dict.admin.users.table.sum}</td>
                                  <td className="py-3 text-purple-400/80">{formatSpeed(Number(stat.speedDown) + Number(stat.speedUp))}</td>
                                  <td className="py-3 text-slate-300">{formatBytes(Number(stat.last5sDown) + Number(stat.last5sUp))}</td>
                                  <td className="py-3 text-slate-300">{formatBytes(Number(stat.last1mDown) + Number(stat.last1mUp))}</td>
                                  <td className="py-3 text-slate-300">{formatBytes(Number(stat.last1hDown) + Number(stat.last1hUp))}</td>
                                  <td className="py-3 text-slate-300">{formatBytes(Number(stat.last1moDown) + Number(stat.last1moUp))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
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
