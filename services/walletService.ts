import axios from 'axios';
import api from '@/lib/api';
import type { TransactionResponse } from '@/types/transaction';
import type {
  ConnectedWallet,
  ConnectedWalletsResponse,
  SetPrimaryWalletResponse,
  ConnectWalletResponse,
} from '@/types/wallet.types';
import type {
  PendingMultiSigResponse,
  SignMultiSigParams,
  SignMultiSigResponse,
} from '@/types/multiSig';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const STELLAR_TESTNET_EXPLORER = 'https://testnet.steexp.com/tx/';
const STELLAR_PUBLIC_EXPLORER = 'https://steexp.com/tx/';

export interface WalletBalance {
  available: number;
  locked: number;
  pending: number;
  total: number;
  currency: string;
}

export interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  balance: WalletBalance;
  requiredAmount: number;
}

export interface ConnectResponse {
  success: boolean;
  message: string;
  publicKey: string;
}

export interface DisconnectResponse {
  success: boolean;
  message: string;
}

export interface BalanceResponse {
  success: boolean;
  balance: number;
  message?: string;
}

/**
 * walletService — responsible for all wallet-related API communication.
 * The hook calls this; components never call this directly.
 *
 * Layered Architecture: Component -> Hook -> Service
 */
class WalletService {
  private static instance: WalletService;
  private balanceCache: WalletBalance | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Fetch wallet balance from backend API
   * Uses cache to prevent unnecessary API calls
   */
  async fetchBalance(forceRefresh = false): Promise<WalletBalance> {
    // Check cache first
    if (!forceRefresh && this.isCacheValid()) {
      return this.balanceCache!;
    }

    try {
      const response = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response structure
      const balance: WalletBalance = {
        available: data.data.available || 0,
        locked: data.data.locked || 0,
        pending: data.data.pending || 0,
        total: data.data.total || 0,
        currency: data.data.currency || 'USD',
      };

      // Update cache
      this.balanceCache = balance;
      this.lastFetchTime = Date.now();

      return balance;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      // Return cached balance if available, otherwise default
      if (this.balanceCache) {
        return this.balanceCache;
      }
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance for a transaction
   */
  async checkSufficientBalance(requiredAmount: number): Promise<BalanceCheckResult> {
    const balance = await this.fetchBalance();
    const hasSufficient = balance.available >= requiredAmount;

    return {
      hasSufficientBalance: hasSufficient,
      balance,
      requiredAmount,
    };
  }

  /**
   * Get cached balance immediately (synchronous)
   * Used for optimistic UI updates
   */
  getCachedBalance(): WalletBalance | null {
    return this.balanceCache;
  }

  /**
   * Pre-fetch balance for future use
   */
  async prefetchBalance(): Promise<void> {
    try {
      await this.fetchBalance();
    } catch (error) {
      // Silently fail - we'll try again later
      console.debug('Balance prefetch failed:', error);
    }
  }

  private isCacheValid(): boolean {
    return (
      this.balanceCache !== null &&
      Date.now() - this.lastFetchTime < this.CACHE_DURATION
    );
  }

  /**
   * Fetch pending multi-signature operations awaiting the given wallet's approval.
   */
  async getPendingMultiSigOperations(walletAddress: string): Promise<PendingMultiSigResponse> {
    const { data } = await api.get<PendingMultiSigResponse>('/wallet/multi-sig/pending', {
      params: { walletAddress },
    });
    return data;
  }

  /**
   * Submit a signature for a multi-sig operation. The backend broadcasts the
   * transaction once all required signatures are collected.
   */
  async signMultiSigOperation(params: SignMultiSigParams): Promise<SignMultiSigResponse> {
    const { data } = await api.post<SignMultiSigResponse>('/wallet/multi-sig/sign', params);
    return data;
  }

  /**
   * Clear the cache (useful for logout or balance updates)
   */
  clearCache(): void {
    this.balanceCache = null;
    this.lastFetchTime = 0;
  }

  /**
   * Register a connected wallet public key with the backend.
   */
  async connect(publicKey: string): Promise<{ success: boolean; message?: string; publicKey: string }> {
    try {
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message, publicKey };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return { success: false, message: 'Failed to connect wallet', publicKey };
    }
  }

  /**
   * Notify the backend to invalidate the wallet session.
   */
  async disconnect(): Promise<void> {
    try {
      await fetch('/api/wallet/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
      });
    } catch (error) {
      console.debug('Disconnect API call failed (session cleared client-side):', error);
    }
  }

  /**
   * Fetch the status of a blockchain transaction by hash.
   */
  async getTransactionStatus(transactionHash: string): Promise<import('@/types/transaction').TransactionResponse> {
    const response = await fetch(`/api/wallet/transaction/${transactionHash}`, {
      headers: {
        Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch every Web3 wallet linked to the authenticated account.
   * The backend owns this list; it is never synthesized on the client.
   */
  async getConnectedWallets(signal?: AbortSignal): Promise<ConnectedWallet[]> {
    const { data } = await axios.get<ConnectedWalletsResponse>(
      `${API_BASE_URL}/api/wallet/connected`,
      { signal }
    );

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Failed to fetch connected wallets');
    }

    return data.data;
  }

  /**
   * Link a wallet to the authenticated account.
   */
  async connectWallet(
    address: string,
    walletType: string = 'freighter'
  ): Promise<ConnectWalletResponse> {
    const { data } = await axios.post<ConnectWalletResponse>(
      `${API_BASE_URL}/api/wallet/connected`,
      { address, provider: walletType, walletType }
    );

    if (!data.success) {
      throw new Error(data.message || 'Failed to connect wallet');
    }

    return data;
  }

  /**
   * Mark a linked wallet as the account's primary wallet.
   */
  async setPrimaryWallet(walletId: string): Promise<SetPrimaryWalletResponse> {
    const { data } = await axios.put<SetPrimaryWalletResponse>(
      `${API_BASE_URL}/api/wallet/connected/${walletId}/primary`
    );

    if (!data.success) {
      throw new Error(data.message || 'Failed to set primary wallet');
    }

    return data;
  }

  /**
   * Unlink a single wallet from the authenticated account.
   */
  async disconnectWallet(walletId: string): Promise<DisconnectResponse> {
    const { data } = await axios.delete<DisconnectResponse>(
      `${API_BASE_URL}/api/wallet/connected/${walletId}`
    );

    if (!data.success) {
      throw new Error(data.message || 'Failed to disconnect wallet');
    }

    return data;
  }
}

export const walletService = WalletService.getInstance();
