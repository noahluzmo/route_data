'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EmbedAuthResponse, LuzmoConnectionStatus } from '@/lib/types';
import { getDefaultDatasetId, getEmbedAuthorization } from '@/lib/services/luzmo-service';

interface RefreshOptions {
  /** When true, do not flip global loading (avoids UI flicker during background token rotation). */
  silent?: boolean;
  /** Dataset the embed token must be able to query (Flex + data API). Should match the workbook / reporting dataset. */
  datasetId?: string;
}

interface UseAuthReturn {
  auth: EmbedAuthResponse | null;
  status: LuzmoConnectionStatus;
  loading: boolean;
  error: string | null;
  refresh: (options?: RefreshOptions) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [auth, setAuth] = useState<EmbedAuthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LuzmoConnectionStatus>({
    connected: false,
    datasetsAvailable: 0,
    lastChecked: null,
  });

  /** Serialize embed refreshes so parallel calls don't mint overlapping tokens (Flex then rejects the "losing" one). */
  const refreshChainRef = useRef(Promise.resolve());

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const job = refreshChainRef.current.then(async () => {
      const silent = options?.silent === true;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const authResponse = await getEmbedAuthorization(options?.datasetId);
        setAuth(authResponse);
        setStatus({
          connected: true,
          datasetsAvailable: 1,
          lastChecked: new Date().toISOString(),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authorization failed';
        setError(message);
        setStatus({
          connected: false,
          datasetsAvailable: 0,
          lastChecked: new Date().toISOString(),
        });
      } finally {
        if (!silent) setLoading(false);
      }
    });
    refreshChainRef.current = job.catch(() => {});
    await job;
  }, []);

  useEffect(() => {
    void refresh({ datasetId: getDefaultDatasetId() });
  }, [refresh]);

  return { auth, status, loading, error, refresh };
}
