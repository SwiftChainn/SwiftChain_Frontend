import { useWalletStore, WALLET_STORAGE_KEY } from '@/store/walletStore';

describe('walletStore', () => {
  afterEach(() => {
    useWalletStore.getState().clearWalletState();
  });

  it('should have correct initial state', () => {
    const state = useWalletStore.getState();
    expect(state.address).toBeNull();
    expect(state.isConnected).toBe(false);
    expect(state.chainId).toBeNull();
  });

  it('should set wallet state with setWallet', () => {
    useWalletStore.getState().setWallet('0xDEADBEEF', 137);
    const state = useWalletStore.getState();
    expect(state.address).toBe('0xDEADBEEF');
    expect(state.isConnected).toBe(true);
    expect(state.chainId).toBe(137);
  });

  it('should reset all fields to initial values on clearWalletState', () => {
    useWalletStore.getState().setWallet('0xDEADBEEF', 137);
    useWalletStore.getState().clearWalletState();
    const state = useWalletStore.getState();
    expect(state.address).toBeNull();
    expect(state.isConnected).toBe(false);
    expect(state.chainId).toBeNull();
  });

  it('should export the correct WALLET_STORAGE_KEY constant', () => {
    expect(WALLET_STORAGE_KEY).toBe('swiftchain_wallet');
  });
});
