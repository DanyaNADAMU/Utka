'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useTrafficStream, RefreshMode } from '@/components/TrafficStreamContext';
import { useTranslation } from '@/i18n/LanguageProvider';

export default function GlobalAutoRefresh({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const dict = useTranslation();
  const { mode, setMode, status, progress5s } = useTrafficStream();

  if (pathname === '/admin/settings') {
    return null;
  }

  const cycleMode = () => {
    if (mode === 'sync') setMode('5sec');
    else if (mode === '5sec') setMode('off');
    else setMode('sync');
  };

  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress5s / 100) * circumference;

  if (collapsed) {
    return (
      <button
        onClick={cycleMode}
        type="button"
        className="flex items-center justify-center p-2 rounded-md border border-slate-700/50 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60 transition-colors"
        title={`Update Mode: ${mode.toUpperCase()} (Click to change)`}
      >
        {mode === 'sync' && (
          <div className="relative w-4 h-4 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
        )}
        {mode === '5sec' && (
          <div className="relative w-4 h-4 shrink-0">
            <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 24 24">
              <circle 
                cx="12" cy="12" r={radius} 
                stroke="currentColor" strokeWidth="2.5" fill="transparent" 
                className="text-slate-800" 
              />
              <circle 
                cx="12" cy="12" r={radius} 
                stroke="currentColor" strokeWidth="2.5" fill="transparent" 
                className="text-amber-400 transition-all duration-75"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
        {mode === 'off' && (
          <div className="w-4 h-4 flex items-center justify-center text-slate-500 font-bold text-[10px]">
            OFF
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-1 rounded-lg border border-slate-700/50 bg-slate-900/60 text-slate-300 min-w-0 flex-1 gap-1">
      <button
        type="button"
        onClick={() => setMode('sync')}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all flex-1 justify-center ${
          mode === 'sync'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
        title="Sync: Instant live SSE updates when master receives data"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {mode === 'sync' && status === 'connected' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            mode === 'sync' 
              ? (status === 'connected' ? 'bg-emerald-500' : 'bg-amber-400')
              : 'bg-slate-600'
          }`}></span>
        </span>
        <span>Sync</span>
      </button>

      <button
        type="button"
        onClick={() => setMode('5sec')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all flex-1 justify-center ${
          mode === '5sec'
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
        title="5sec: Regular polling interval"
      >
        {mode === '5sec' && (
          <svg className="w-3 h-3 -rotate-90 transform shrink-0" viewBox="0 0 24 24">
            <circle 
              cx="12" cy="12" r={radius} 
              stroke="currentColor" strokeWidth="3" fill="transparent" 
              className="text-slate-800" 
            />
            <circle 
              cx="12" cy="12" r={radius} 
              stroke="currentColor" strokeWidth="3" fill="transparent" 
              className="text-amber-400 transition-all duration-75"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
        )}
        <span>5s</span>
      </button>

      <button
        type="button"
        onClick={() => setMode('off')}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all flex-1 justify-center ${
          mode === 'off'
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
        title="Off: Disable automatic updates"
      >
        <span>Off</span>
      </button>
    </div>
  );
}
