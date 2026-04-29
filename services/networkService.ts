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