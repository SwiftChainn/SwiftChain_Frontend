<<<<<<< HEAD
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
=======
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface NetworkInfo {
  network: string; // e.g. "testnet" | "mainnet" | "futurenet"
  passphrase: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * networkService — fetches the current network the connected wallet is on.
 * The backend queries Horizon / the Stellar RPC so no secrets hit the browser.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const networkService = {
  /**
   * Ask the backend which network the wallet at `address` is currently on.
   */
  async getWalletNetwork(address: string): Promise<ApiResponse<NetworkInfo>> {
    const { data } = await axios.get<ApiResponse<NetworkInfo>>(
      `${API_BASE_URL}/api/wallet/network`,
      { params: { address } }
    );
    return data;
  },
};
>>>>>>> 74e81882006dc98acc50f40f8727f145b3b95a9b
