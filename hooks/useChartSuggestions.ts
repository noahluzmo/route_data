'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FieldMetadata } from '@/lib/types';

/** Deterministic chart from `POST /api/ai-chart` (no `question` body). */
export interface ChartSuggestion {
  title: string;
  chartType: string;
  slots: unknown[];
  options: Record<string, unknown>;
}

export function useChartSuggestions(datasetId: string, selectedFields: FieldMetadata[]) {
  const [charts, setCharts] = useState<ChartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchKey = useRef('');

  const hasFields = selectedFields.length > 0;
  const selectionKey = useMemo(
    () => selectedFields.map((f) => f.id).sort().join(','),
    [selectedFields]
  );

  const fetchSuggestions = useCallback(async () => {
    if (!datasetId || !hasFields) return;

    const fetchKey = `${datasetId}:${selectionKey}`;
    if (lastFetchKey.current === fetchKey) return;
    lastFetchKey.current = fetchKey;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: datasetId.trim(),
          selected_column_ids: selectedFields.map((f) => f.id.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `Failed (${res.status})`);
      }

      const data = await res.json();
      setCharts((data.charts as ChartSuggestion[]) || []);
    } catch (err) {
      console.error('useChartSuggestions fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
      lastFetchKey.current = '';
    } finally {
      setLoading(false);
    }
  }, [datasetId, hasFields, selectionKey, selectedFields]);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const refetch = useCallback(() => {
    lastFetchKey.current = '';
    void fetchSuggestions();
  }, [fetchSuggestions]);

  return { charts, loading, error, refetch, hasFields };
}
