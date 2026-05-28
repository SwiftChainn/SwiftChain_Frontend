/**
 * networkService — responsible for monitoring network connectivity status.
 * This follows the Strict Layered Architecture (Service layer).
 */
export const networkService = {
  /**
   * Returns the current online status.
   */
  getIsOnline: (): boolean => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  },

  /**
   * Subscribes to online/offline events.
   * Returns a cleanup function.
   */
  subscribe: (callback: (isOnline: boolean) => void) => {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
