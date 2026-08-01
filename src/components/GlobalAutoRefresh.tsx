'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';

export default function GlobalAutoRefresh({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const dict = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Exclude settings page from auto-refresh
    if (pathname === '/admin/settings') return;

    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    let animationFrame: number;
    const animate = () => {
      const msInCycle = Date.now() % 5000;
      setProgress((msInCycle / 5000) * 100);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrame);
    };
  }, [router, pathname]);

  if (pathname === '/admin/settings') {
    return null;
  }

  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (collapsed) {
    return (
      <div 
        className="flex items-center justify-center p-2 rounded-md border border-slate-700/50 bg-slate-800/40 text-slate-300"
        title={dict.admin.users.profile.auto_update || 'Auto-update'}
      >
        <div className="relative w-4 h-4 shrink-0">
          <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 24 24">
            <circle 
              cx="12" cy="12" r={radius} 
              stroke="currentColor" strokeWidth="3" fill="transparent" 
              className="text-slate-800" 
            />
            <circle 
              cx="12" cy="12" r={radius} 
              stroke="currentColor" strokeWidth="3" fill="transparent" 
              className="text-emerald-400 transition-all duration-75"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-700/50 bg-slate-800/40 text-slate-300 transition-colors min-w-0 flex-1"
      title={dict.admin.users.profile.auto_update || 'Auto-update'}
    >
      <div className="relative w-4 h-4 shrink-0">
        <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 24 24">
          <circle 
            cx="12" cy="12" r={radius} 
            stroke="currentColor" strokeWidth="3" fill="transparent" 
            className="text-slate-800" 
          />
          <circle 
            cx="12" cy="12" r={radius} 
            stroke="currentColor" strokeWidth="3" fill="transparent" 
            className="text-emerald-400 transition-all duration-75"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-xs font-medium text-slate-300 truncate">
        Update
      </span>
    </div>
  );
}
