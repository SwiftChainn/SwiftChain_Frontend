import { useCallback, useEffect, useRef, useState } from 'react';
import { networkService } from '@/services/networkService';

const BACK_ONLINE_DISPLAY_MS = 2000;

/**
 * useOffline — robust network status detector.
 *
 * `isOnline` reflects real connectivity, not just `navigator.onLine`:
 * - An `offline` event is trusted immediately (browsers reliably report
 *   when the interface actually drops).
 * - An `online` event only means a network interface became active, so it
 *   is verified against the backend before `isOnline` flips to true. This
 *   also fixes the state desync during network flapping: each transition
 *   bumps a generation counter and aborts any in-flight verification from
 *   a previous transition, so a stale response can never overwrite the
 *   current (correct) state.
 *
 * `showBackOnline` is a separate, transient flag that is true for
 * `BACK_ONLINE_DISPLAY_MS` after a confirmed reconnect, for the banner's
 * success message — it never blocks `isOnline` from updating promptly.
 * It is only ever shown for a genuine reconnect: a stray `online` event
 * while the app was never offline must not flash the banner.
 */
const useOffline = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    networkService.getIsOnline()
  );
  const [showBackOnline, setShowBackOnline] = useState<boolean>(false);

  // True when the app has actually been offline since mount (or since the
  // last confirmed reconnect). Read inside the event handlers via this ref
  // — never via a stale closure over `isOnline`.
  const wasOfflineRef = useRef(!isOnline);

  const backOnlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const verifyControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const clearBackOnlineTimeout = useCallback(() => {
    if (backOnlineTimeoutRef.current) {
      clearTimeout(backOnlineTimeoutRef.current);
      backOnlineTimeoutRef.current = null;
    }
  }, []);

  const abortPendingVerification = useCallback(() => {
    verifyControllerRef.current?.abort();
    verifyControllerRef.current = null;
  }, []);

  useEffect(() => {
    const handleNetworkChange = (browserSaysOnline: boolean) => {
      generationRef.current += 1;
      const generation = generationRef.current;
      abortPendingVerification();

      if (!browserSaysOnline) {
        clearBackOnlineTimeout();
        setShowBackOnline(false);
        setIsOnline(false);
        wasOfflineRef.current = true;
        return;
      }

      const controller = new AbortController();
      verifyControllerRef.current = controller;

      networkService
        .checkConnectivity(controller.signal)
        .then((reachable) => {
          // A newer transition has already superseded this check — ignore
          // the (possibly stale) result to avoid desyncing the state.
          if (generation !== generationRef.current || !reachable) return;

          setIsOnline(true);

          // Only flash the success state for a genuine reconnect. A stray
          // 'online' event while we were never offline must not pop the
          // banner — `isOnline` still flips promptly above either way.
          if (!wasOfflineRef.current) return;
          wasOfflineRef.current = false;

          setShowBackOnline(true);
          clearBackOnlineTimeout();
          backOnlineTimeoutRef.current = setTimeout(() => {
            setShowBackOnline(false);
          }, BACK_ONLINE_DISPLAY_MS);
        })
        .catch(() => {
          // Aborted or network failure — leave state as-is.
        });
    };

    const handleOnline = () => handleNetworkChange(true);
    const handleOffline = () => handleNetworkChange(false);

    if (typeof window === 'undefined') return undefined;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearBackOnlineTimeout();
      abortPendingVerification();
    };
  }, [clearBackOnlineTimeout, abortPendingVerification]);

  return {
    isOnline,
    showBackOnline,
  };
};

export default useOffline;
