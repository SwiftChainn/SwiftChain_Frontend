import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const WALLET_STORAGE_KEY = 'swiftchain_wallet';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

interface WalletActions {
  setWallet: (address: string, chainId: number) => void;
  clearWalletState: () => void;
}

type WalletStore = WalletState & WalletActions;

const initialState: WalletState = {
  address: null,
  isConnected: false,
  chainId: null,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      ...initialState,

      setWallet: (address: string, chainId: number) =>
        set({ address, isConnected: true, chainId }),

      clearWalletState: () => set(initialState),
    }),
    {
      name: WALLET_STORAGE_KEY,
      // Only persist the connection state, not the actions
      partialize: (state) => ({
        address: state.address,
        isConnected: state.isConnected,
        chainId: state.chainId,
      }),
    }
  )
);
