'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { walletService } from '@/services/walletService';
import { useWalletStore } from '@/store/walletStore';
import type { ConnectedWallet } from '@/types/wallet.types';

export interface UseWalletManagementResult {
  /** Every wallet linked to the account, as reported by the backend. */
  wallets: ConnectedWallet[];
  /** The connected wallet matching the wallet context (Zustand) address, if any. */
  activeWallet: ConnectedWallet | null;
  activeAddress: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isDisconnecting: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Unlink a wallet. Returns true on success. */
  disconnectWallet: (_wallet: ConnectedWallet) => Promise<boolean>;
  /** Promote a wallet to the active session in the shared wallet context. */
  setActiveWallet: (_wallet: ConnectedWallet) => void;
}

/**
 * useWalletManagement — data layer for the Wallet Management settings tab.
 *
 * Layered Architecture:
 *   ConnectedWallets (Component) → useWalletManagement (Hook) → walletService (Service)
 *
 * The hook also keeps the shared wallet context (`useWalletStore`) in sync with
 * the backend list: when the persisted address no longer exists on the server the
 * stale session is cleared, and selecting a wallet writes it back to the store.
 */
export function useWalletManagement(): UseWalletManagementResult {
  const address = useWalletStore((state) => state.address);
  const isConnected = useWalletStore((state) => state.isConnected);
  const setWallet = useWalletStore((state) => state.setWallet);
  const clearWalletState = useWalletStore((state) => state.clearWalletState);

  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    walletService
      .getConnectedWallets(controller.signal)
      .then((data) => {
        if (cancelled) return;
        setWallets(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || axios.isCancel(err)) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to load connected wallets';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadTick]);

  const refetch = useCallback(async (): Promise<void> => {
    setError(null);
    setReloadTick((tick) => tick + 1);
  }, []);

  // Keep the wallet context in sync: drop a persisted session whose address is
  // no longer linked to the account on the backend.
  useEffect(() => {
    if (isLoading || address === null) return;
    const stillLinked = wallets.some((wallet) => wallet.address === address);
    if (!stillLinked) {
      clearWalletState();
    }
  }, [wallets, address, isLoading, clearWalletState]);

  const activeWallet = useMemo(
    () => wallets.find((wallet) => wallet.address === address) ?? null,
    [wallets, address]
  );

  const setActiveWallet = useCallback(
    (wallet: ConnectedWallet): void => {
      setWallet(wallet.address, 0);
    },
    [setWallet]
  );

  const disconnectWallet = useCallback(
    async (wallet: ConnectedWallet): Promise<boolean> => {
      setIsDisconnecting(true);
      try {
        await walletService.disconnectWallet(wallet.id);
        setWallets((prev) => prev.filter((item) => item.id !== wallet.id));
        // Sync the shared wallet context when the removed wallet was active.
        if (wallet.address === address) {
          clearWalletState();
        }
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to disconnect wallet';
        setError(message);
        return false;
      } finally {
        setIsDisconnecting(false);
      }
    },
    [address, clearWalletState]
  );

  return {
    wallets,
    activeWallet,
    activeAddress: address,
    isConnected,
    isLoading,
    isDisconnecting,
    error,
    refetch,
    disconnectWallet,
    setActiveWallet,
  };
}
