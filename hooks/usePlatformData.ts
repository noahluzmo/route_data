'use client';

import { useState, useEffect } from 'react';

export interface KPIs {
  onTimeDeliveryPct: number;
  avgDeliveryDelay: number;
  costPerShipment: number;
  carrierReliability: number;
  deliveryTrend: number;
  delayTrend: number;
  costTrend: number;
}

export interface Target {
  name: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
  year: number;
  progress: number;
}

export interface DatasetInfo {
  name: string;
  id: string;
  totalRows: number;
  columns: number;
}

export interface PlatformData {
  kpis: KPIs;
  targets: Target[];
  dataset: DatasetInfo;
}

export function usePlatformData() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/platform-data');
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
