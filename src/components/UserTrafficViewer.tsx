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

export default function UserTrafficViewer({ subId, trafficState }: { subId: string, trafficState: TrafficState }) {
  const dict = useTranslation();

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
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
      <TrafficTableUI 
        title={dict.admin.users.profile.detailed_stats || 'Traffic History'} 
        traffic={formattedStat} 
      />
    </div>
  );
}
