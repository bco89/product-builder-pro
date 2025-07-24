import { useCallback, useEffect, useRef } from 'react';
import { useFetcher } from '@remix-run/react';

interface CacheRefreshOptions {
  endpoint: string;
  params?: Record<string, string>;
  enabled?: boolean;
  onRefresh?: () => void;
}

export function useCacheRefresh({ 
  endpoint, 
  params = {}, 
  enabled = true,
  onRefresh 
}: CacheRefreshOptions) {
  const fetcher = useFetcher();
  const isRefreshing = useRef(false);
  
  const refresh = useCallback(() => {
    if (!enabled || isRefreshing.current) return;
    
    isRefreshing.current = true;
    
    const searchParams = new URLSearchParams({
      ...params,
      refresh: 'true'
    });
    
    fetcher.load(`${endpoint}?${searchParams.toString()}`);
    
    if (onRefresh) {
      onRefresh();
    }
  }, [endpoint, params, enabled, fetcher, onRefresh]);
  
  // Reset refreshing state when fetcher completes
  useEffect(() => {
    if (fetcher.state === 'idle') {
      isRefreshing.current = false;
    }
  }, [fetcher.state]);
  
  return {
    refresh,
    isRefreshing: fetcher.state !== 'idle'
  };
}