'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';

export default function GlobalAutoRefresh() {
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

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed top-6 right-8 z-50 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-full shadow-lg">
      <span className="text-sm font-medium text-slate-400">
        {dict.admin.users.profile.auto_update || 'Auto-update'}
      </span>
      <div className="relative w-5 h-5">
        <svg className="w-5 h-5 -rotate-90 transform" viewBox="0 0 24 24">
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
