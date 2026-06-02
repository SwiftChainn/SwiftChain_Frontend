import { useEffect, useState } from 'react';
import { networkService } from '@/services/networkService';

/**
 * useOffline — Hook to detect network status.
 */
const useOffline = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    networkService.getIsOnline()
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(networkService.getIsOnline());

    const unsubscribe = networkService.subscribe((status) => {
      setIsOnline(status);
    });

    return () => unsubscribe();
  }, []);

  return {
    isOnline,
  };
};

export default useOffline;
