'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type RefreshMode = 'sync' | '5sec' | 'off';

export interface TrafficData {
  subscriptions: Record<string, any>;
  uuids: Record<string, any>;
  nodes: Record<string, any>;
  lastUpdated: number | null;
}

interface TrafficStreamContextType {
  mode: RefreshMode;
  setMode: (mode: RefreshMode) => void;
  status: 'connected' | 'connecting' | 'polling' | 'off' | 'error';
  trafficData: TrafficData;
  progress5s: number;
}

const TrafficStreamContext = createContext<TrafficStreamContextType>({
  mode: 'sync',
  setMode: () => {},
  status: 'off',
  trafficData: { subscriptions: {}, uuids: {}, nodes: {}, lastUpdated: null },
  progress5s: 0,
});

export function TrafficStreamProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mode, setModeState] = useState<RefreshMode>('sync');
  const [status, setStatus] = useState<'connected' | 'connecting' | 'polling' | 'off' | 'error'>('connecting');
  const [trafficData, setTrafficData] = useState<TrafficData>({
    subscriptions: {},
    uuids: {},
    nodes: {},
    lastUpdated: null,
  });
  const [progress5s, setProgress5s] = useState<number>(0);

  // Load persisted mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nadamudash_refresh_mode') as RefreshMode;
      if (saved && (saved === 'sync' || saved === '5sec' || saved === 'off')) {
        setModeState(saved);
      }
    } catch (e) {
      console.error('Failed to load refresh mode from localStorage', e);
    }
  }, []);

  const setMode = useCallback((newMode: RefreshMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('nadamudash_refresh_mode', newMode);
    } catch (e) {
      console.error('Failed to save refresh mode to localStorage', e);
    }
  }, []);

  // Handle SSE when mode === 'sync'
  useEffect(() => {
    if (mode !== 'sync') return;

    setStatus('connecting');
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/admin/traffic/sse');

      eventSource.onopen = () => {
        setStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTrafficData({
            subscriptions: data.subscriptions || {},
            uuids: data.uuids || {},
            nodes: data.nodes || {},
            lastUpdated: data.timestamp || Date.now(),
          });
          setStatus('connected');
        } catch (e) {
          console.error('Error parsing SSE data', e);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        setStatus('error');
      };
    } catch (e) {
      console.error('Failed to initialize EventSource', e);
      setStatus('error');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [mode]);

  // Handle 5sec polling when mode === '5sec'
  useEffect(() => {
    if (mode !== '5sec') return;

    setStatus('polling');

    const fetchTraffic = async () => {
      try {
        const res = await fetch('/api/admin/traffic?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setTrafficData({
            subscriptions: data.subscriptions || {},
            uuids: data.uuids || {},
            nodes: data.nodes || {},
            lastUpdated: Date.now(),
          });
        }
      } catch (err) {
        console.error('Failed 5sec fetch', err);
      }
    };

    fetchTraffic();

    const interval = setInterval(() => {
      router.refresh();
      fetchTraffic();
    }, 5000);

    let animationFrame: number;
    const animate = () => {
      const msInCycle = Date.now() % 5000;
      setProgress5s((msInCycle / 5000) * 100);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrame);
    };
  }, [mode, router]);

  // Handle mode === 'off'
  useEffect(() => {
    if (mode === 'off') {
      setStatus('off');
    }
  }, [mode]);

  return (
    <TrafficStreamContext.Provider value={{ mode, setMode, status, trafficData, progress5s }}>
      {children}
    </TrafficStreamContext.Provider>
  );
}

export function useTrafficStream() {
  return useContext(TrafficStreamContext);
}
