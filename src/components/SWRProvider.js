'use client';

import { SWRConfig } from 'swr';
import { fetcher, swrOptions } from '@/lib/fetcher';

/**
 * Global SWR provider that wraps the app.
 * Keeps the SWR cache alive across page navigations in Next.js App Router.
 * Cache lives in memory — survives route changes, cleared on full page reload.
 */
export default function SWRProvider({ children }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        ...swrOptions,
      }}
    >
      {children}
    </SWRConfig>
  );
}
