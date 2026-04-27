import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore, WALLET_STORAGE_KEY } from '@/store/walletStore';
import { walletService } from '@/services/walletService';

/**
 * useWallet — the single hook for wallet session management.
 *
 * disconnect() performs a strict three-step security cleanup:
 *   1. Notifies the backend to invalidate the session
 *   2. Clears all wallet state from Zustand (strips public keys from DOM)
 *   3. Removes the wallet cache from localStorage
 *   4. Redirects the user to the safe /login page
 *
 * Cleanup in step 2-4 runs unconditionally via `finally` — even if the
 * API call fails, the client-side session is always fully cleared.
 */
export function useWallet() {
  const router = useRouter();

  const address = useWalletStore((state) => state.address);
  const isConnected = useWalletStore((state) => state.isConnected);
  const clearWalletState = useWalletStore((state) => state.clearWalletState);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await walletService.disconnect();
    } catch {
    } finally {
      clearWalletState();

      localStorage.removeItem(WALLET_STORAGE_KEY);

      router.push('/login');
    }
  }, [clearWalletState, router]);

  return { address, isConnected, disconnect };
}
