'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Server, Users, Network, HardDrive, Cpu, ArrowDown, ArrowUp } from 'lucide-react';

interface SystemStats {
  cpu: number;
  ram: number;
  history: { date: string; up: string; down: string }[];
}

interface GlobalTrafficStats {
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

export default function AdminDashboardClient({ 
  totalUsers, 
  totalSubs, 
  totalNodes 
}: { 
  totalUsers: number;
  totalSubs: number;
  totalNodes: number;
}) {
  const dict = useTranslation();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [globalTraffic, setGlobalTraffic] = useState<GlobalTrafficStats>({ 
    speedUp: 0, speedDown: 0, 
    last5sUp: 0, last5sDown: 0, 
    last1mUp: 0, last1mDown: 0, 
    last1hUp: 0, last1hDown: 0, 
    last1moUp: 0, last1moDown: 0, 
    totalUp: 0, totalDown: 0 
  });

  useEffect(() => {
    // Fetch static system stats (history) and initial cpu/ram
    const fetchSystemStats = async () => {
      try {
        const res = await fetch('/api/admin/system');
        if (res.ok) {
          setSystemStats(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch system stats', e);
      }
    };
    fetchSystemStats();

    // Fetch live traffic and cpu/ram updates
    const fetchLiveStats = async () => {
      try {
        const trafficRes = await fetch('/api/admin/traffic');
        if (trafficRes.ok) {
          const trafficData = await trafficRes.json();
          let gt = {
            speedUp: 0, speedDown: 0, 
            last5sUp: 0, last5sDown: 0, 
            last1mUp: 0, last1mDown: 0, 
            last1hUp: 0, last1hDown: 0, 
            last1moUp: 0, last1moDown: 0, 
            totalUp: 0, totalDown: 0 
          };
          Object.values(trafficData).forEach((t: any) => {
            gt.speedUp += Number(t.speedUp || 0);
            gt.speedDown += Number(t.speedDown || 0);
            gt.last5sUp += Number(t.last5sUp || 0);
            gt.last5sDown += Number(t.last5sDown || 0);
            gt.last1mUp += Number(t.last1mUp || 0);
            gt.last1mDown += Number(t.last1mDown || 0);
            gt.last1hUp += Number(t.last1hUp || 0);
            gt.last1hDown += Number(t.last1hDown || 0);
            gt.last1moUp += Number(t.last1moUp || 0);
            gt.last1moDown += Number(t.last1moDown || 0);
            gt.totalUp += Number(t.totalUp || 0);
            gt.totalDown += Number(t.totalDown || 0);
          });
          setGlobalTraffic(gt);
        }
        
        // Also refresh CPU/RAM occasionally (every 5s is fine)
        const sysRes = await fetch('/api/admin/system');
        if (sysRes.ok) {
          setSystemStats(await sysRes.json());
        }
      } catch (e) {
        console.error('Failed to fetch live stats', e);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const chartData = systemStats?.history?.map(d => ({
    name: new Date(d.date).toLocaleDateString(),
    Up: Number(BigInt(d.up) / BigInt(1024 * 1024)), // MB
    Down: Number(BigInt(d.down) / BigInt(1024 * 1024)), // MB
    Sum: Number((BigInt(d.up) + BigInt(d.down)) / BigInt(1024 * 1024)) // MB
  })) || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{dict.admin.dash.title}</h1>
        <p className="text-slate-400 mt-2">{dict.admin.dash.subtitle}</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users className="w-6 h-6 text-blue-400" />}
          title={dict.admin.dash.total_users}
          value={totalUsers}
        />
        <StatCard 
          icon={<Network className="w-6 h-6 text-purple-400" />}
          title={dict.admin.dash.total_subs}
          value={totalSubs}
        />
        <StatCard 
          icon={<Server className="w-6 h-6 text-emerald-400" />}
          title={dict.admin.dash.total_nodes}
          value={totalNodes}
        />
      </div>

      {/* Middle Row: Server Status & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Server Status */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col lg:col-span-1">
          <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-emerald-400" />
            {dict.admin.dash.server_status}
          </h2>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            <ProgressRing 
              icon={<Cpu className="w-5 h-5" />} 
              label={dict.admin.dash.cpu} 
              percent={systemStats?.cpu || 0} 
              color="text-emerald-400" 
              stroke="stroke-emerald-400" 
            />
            <ProgressRing 
              icon={<HardDrive className="w-5 h-5" />} 
              label={dict.admin.dash.ram} 
              percent={systemStats?.ram || 0} 
              color="text-blue-400" 
              stroke="stroke-blue-400" 
            />
          </div>
        </div>

        {/* Traffic History Chart */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-purple-400" />
            {dict.admin.dash.history}
          </h2>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} MB`} />
                  <Tooltip 
                    cursor={{fill: '#1e293b'}} 
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px'}}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="Down" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Up" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Sum" fill="#c084fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                {dict.admin.dash.history_empty}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Global Traffic Table */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
          <Network className="w-5 h-5 mr-2 text-blue-400" />
          {dict.admin.dash.global_traffic_table || 'Серверная статистика трафика'}
        </h2>
        
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
              </tr>
            </thead>
            <tbody className="text-sm text-slate-300">
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-4 font-medium text-emerald-400 flex items-center">
                  <ArrowDown className="w-4 h-4 mr-1" /> {dict.common.downloaded || 'Download'}
                </td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.speedDown)}/s</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last5sDown)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1mDown)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1hDown)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1moDown)}</td>
              </tr>
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-4 font-medium text-blue-400 flex items-center">
                  <ArrowUp className="w-4 h-4 mr-1" /> {dict.common.uploaded || 'Upload'}
                </td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.speedUp)}/s</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last5sUp)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1mUp)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1hUp)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1moUp)}</td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors font-semibold">
                <td className="py-4 px-4 text-purple-400 flex items-center">
                  <Activity className="w-4 h-4 mr-1" /> Sum
                </td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.speedDown + globalTraffic.speedUp)}/s</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last5sDown + globalTraffic.last5sUp)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1mDown + globalTraffic.last1mUp)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1hDown + globalTraffic.last1hUp)}</td>
                <td className="py-4 px-4">{formatBytes(globalTraffic.last1moDown + globalTraffic.last1moUp)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center shadow-xl relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-300">
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-32 h-32" })}
      </div>
      <div className="relative z-10 flex items-center w-full">
        <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mr-4">
          {icon}
        </div>
        <div>
          <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
          <p className="text-3xl font-bold text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ icon, label, percent, color, stroke }: { icon: React.ReactNode, label: string, percent: number, color: string, stroke: string }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center space-x-4">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="32" cy="32" r={radius} className="stroke-slate-800" strokeWidth="4" fill="transparent" />
          <circle 
            cx="32" 
            cy="32" 
            r={radius} 
            className={`${stroke} transition-all duration-1000 ease-out`} 
            strokeWidth="4" 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{percent.toFixed(1)}%</p>
      </div>
    </div>
  );
}
