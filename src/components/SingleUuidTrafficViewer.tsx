'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';
import TrafficTableUI from '@/components/TrafficTableUI';

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

export default function SingleUuidTrafficViewer({ xrayUuid, trafficState: initialTrafficState }: { xrayUuid: string, trafficState: TrafficState }) {
  const dict = useTranslation();
  const [trafficState, setTrafficState] = useState<any>(initialTrafficState);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isFetching = false;
    
    const fetchTraffic = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const res = await fetch('/api/admin/traffic?t=' + Date.now(), { cache: 'no-store' });
        const data = await res.json();
        if (data.uuids && data.uuids[xrayUuid]) {
          setTrafficState(data.uuids[xrayUuid]);
        }
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

    return () => clearTimeout(timeoutId);
  }, [xrayUuid]);

  const formattedStat = {
    speedUp: Number(trafficState?.speedUp || 0),
    speedDown: Number(trafficState?.speedDown || 0),
    last5sUp: Number(trafficState?.last5sUp || 0),
    last5sDown: Number(trafficState?.last5sDown || 0),
    last1mUp: Number(trafficState?.last1mUp || 0),
    last1mDown: Number(trafficState?.last1mDown || 0),
    last1hUp: Number(trafficState?.last1hUp || 0),
    last1hDown: Number(trafficState?.last1hDown || 0),
    last1moUp: Number(trafficState?.last1moUp || 0),
    last1moDown: Number(trafficState?.last1moDown || 0),
    totalUp: Number(trafficState?.totalUp || 0),
    totalDown: Number(trafficState?.totalDown || 0),
  };

  return (
    <TrafficTableUI 
      title={dict.admin.users.profile.detailed_stats || "Detailed Traffic Stats"} 
      traffic={formattedStat} 
    />
  );
}
