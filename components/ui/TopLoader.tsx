/**
 * TopLoader Component
 * Global progress bar displayed at the top of the viewport during route navigation
 * Uses primary brand color and provides smooth visual feedback
 */

'use client';

import { useTopLoader } from '@/hooks/useTopLoader';

export default function TopLoader(): JSX.Element {
  const isLoading = useTopLoader();

  return (
    <>
      {/* Progress bar */}
      <div
        className={`
          fixed top-0 left-0 h-1 bg-primary
          transition-all duration-300 ease-out z-50
          ${isLoading ? 'w-full opacity-100' : 'w-0 opacity-0'}
        `}
        role="progressbar"
        aria-label="Page loading progress"
        aria-valuenow={isLoading ? 75 : 100}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* Optional: Subtle shadow effect */}
      <div
        className={`
          fixed top-1 left-0 h-px bg-gradient-to-r from-primary to-transparent
          transition-opacity duration-300 ease-out z-50
          ${isLoading ? 'opacity-50' : 'opacity-0'}
        `}
      />
    </>
  );
}
