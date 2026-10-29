'use client';

import { useState, useEffect } from 'react';

export default function KumaStatus({ dict }: { dict: any }) {
  const [status, setStatus] = useState<'loading' | 'up' | 'down' | 'error' | 'empty'>('loading');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('https://status.nada.mu/api/status-page/main');
        if (!response.ok) throw new Error('Status page fetch failed');
        const data = await response.json();

        const monitorIds: number[] = [];
        if (data.publicGroupList) {
          for (const group of data.publicGroupList) {
            for (const monitor of group.monitorList) {
              monitorIds.push(monitor.id);
            }
          }
        }

        if (monitorIds.length === 0) {
          setStatus('empty');
          return;
        }

        let allUp = true;
        const badgeRequests = monitorIds.map(id =>
          fetch(`https://status.nada.mu/api/badge/${id}/status`)
            .then(res => res.text())
        );

        const badgesSvg = await Promise.all(badgeRequests);
        for (const svg of badgesSvg) {
          const lowerSvg = svg.toLowerCase();
          if (lowerSvg.includes('>down<') || lowerSvg.includes('>pending<') || lowerSvg.includes('#dc3545')) {
            allUp = false;
            break;
          }
        }

        setStatus(allUp ? 'up' : 'down');
      } catch (error) {
        console.error('Status fetch error:', error);
        setStatus('error');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const styles = {
    up: {
      badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse'
    },
    down: {
      badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]'
    },
    error: {
      badge: 'bg-red-500/10 text-red-500 border-red-500/20',
      dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'
    },
    loading: {
      badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400'
    },
    empty: {
      badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400'
    }
  };

  const currentStyle = styles[status];

  return (
    <a 
      href="https://status.nada.mu/status/main" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-all hover:opacity-80 ${currentStyle.badge}`}
    >
      <div className={`w-2 h-2 rounded-full ${currentStyle.dot}`}></div>
      <span>{dict[`status_${status}`]}</span>
    </a>
  );
}
