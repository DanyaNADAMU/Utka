'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';
import TrafficTableUI from '@/components/TrafficTableUI';

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
        const res = await fetch('/api/admin/traffic?t=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        setTraffic(data.subscriptions || {});
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
    speedUp: 0, speedDown: 0,
    last5sUp: 0, last5sDown: 0,
    last1mUp: 0, last1mDown: 0,
    last1hUp: 0, last1hDown: 0,
    last1moUp: 0, last1moDown: 0,
    totalUp: 0, totalDown: 0,
  };

  // Convert string values to numbers for TrafficTableUI
  const formattedStat = {
    speedUp: Number(stat.speedUp),
    speedDown: Number(stat.speedDown),
    last5sUp: Number(stat.last5sUp),
    last5sDown: Number(stat.last5sDown),
    last1mUp: Number(stat.last1mUp),
    last1mDown: Number(stat.last1mDown),
    last1hUp: Number(stat.last1hUp),
    last1hDown: Number(stat.last1hDown),
    last1moUp: Number(stat.last1moUp),
    last1moDown: Number(stat.last1moDown),
    totalUp: Number(stat.totalUp),
    totalDown: Number(stat.totalDown),
  };

  return (
    <TrafficTableUI 
      title={dict.admin.users.profile.detailed_stats} 
      traffic={formattedStat} 
      progress={progress} 
    />
  );
}
