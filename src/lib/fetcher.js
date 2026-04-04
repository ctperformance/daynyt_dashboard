/**
 * Shared SWR fetcher and configuration for the dashboard.
 *
 * Usage:
 *   import useSWR from 'swr';
 *   import { fetcher, swrOptions } from '@/lib/fetcher';
 *   const { data, error, isLoading } = useSWR('/api/...', fetcher, swrOptions);
 */

// Standard JSON fetcher for SWR
export const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('API request failed');
    error.status = res.status;
    try {
      error.info = await res.json();
    } catch {
      error.info = {};
    }
    throw error;
  }
  return res.json();
};

// Default SWR options — stale-while-revalidate pattern
// Data is cached and shown instantly, revalidated in background
export const swrOptions = {
  revalidateOnFocus: false,       // Don't refetch when tab regains focus
  revalidateOnReconnect: true,    // Refetch when internet reconnects
  dedupingInterval: 30000,        // Deduplicate same requests within 30s
  errorRetryCount: 2,             // Retry failed requests max 2 times
  keepPreviousData: true,         // Show old data while loading new
};

// Shorter cache for frequently changing data (Meta campaigns etc.)
export const swrLiveOptions = {
  ...swrOptions,
  refreshInterval: 0,             // No auto-refresh (manual refresh button)
  dedupingInterval: 60000,        // Cache for 60s before allowing re-fetch
};

// Longer cache for rarely changing data (integration status etc.)
export const swrStaticOptions = {
  ...swrOptions,
  dedupingInterval: 120000,       // Cache for 2 minutes
  revalidateIfStale: false,       // Don't auto-revalidate stale data
};
