'use client';

import dynamic from 'next/dynamic';
import type { Driver } from '@/types/fleet';

interface FleetMapProps {
  drivers: Driver[];
}

// react-leaflet uses `window`/`document` at import time, so it must be
// loaded only on the client. This keeps the page itself SSR-friendly.
const FleetMapClient = dynamic(() => import('./FleetMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
      Loading map…
    </div>
  ),
});

export function FleetMap({ drivers }: FleetMapProps) {
  return (
    <section
      aria-label="Fleet map"
      className="h-[28rem] overflow-hidden rounded-md border border-gray-200 bg-white"
    >
      <FleetMapClient drivers={drivers} />
    </section>
  );
}
