import axios from 'axios';
import api from '@/lib/api';
import type { TransactionResponse } from '@/types/transaction';
import type {
  ConnectedWallet,
  ConnectedWalletsResponse,
  SetPrimaryWalletResponse,
  ConnectWalletResponse,
} from '@/types/wallet.types';

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

export interface Signer {
  publicKey: string;
  weight: number;
  approved: boolean;
}

export interface PendingMultiSigOperation {
  operationId: string;
  transactionEnvelope: string;
  description: string;
  signaturesRequired: number;
  currentSignatures: number;
  signers: Signer[];
  createdAt: string;
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  expiresAt: string;
}

export interface PendingMultiSigResponse {
  success: boolean;
  message: string;
  operations?: PendingMultiSigOperation[];
  totalCount?: number;
}

export interface SignMultiSigParams {
  operationId: string;
  signature: string;
  signerPublicKey: string;
}

export interface SignMultiSigResponse {
  success: boolean;
  message: string;
  transactionHash?: string;
  operationId?: string;
  currentSignatures?: number;
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
  private cacheOwner: string | null = null;
  private fetchGeneration = 0;
  private inFlight: { owner: string | null; generation: number; promise: Promise<WalletBalance> } | null = null;

  private ownerToken(): string | null {
    if (typeof window === 'undefined') return null;
    try { return window.localStorage.getItem('authToken'); } catch { return null; }
  }
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
    const owner = this.ownerToken();
    if (!forceRefresh && this.isCacheValid()) return this.balanceCache!;
    if (!forceRefresh && this.inFlight?.owner === owner) return this.inFlight.promise;

    const generation = ++this.fetchGeneration;
    const promise = api.get<{ data: WalletBalance }>('/wallet/balance')
      .then(({ data }) => {
        const balance = data.data;
        if (!balance || !['available', 'locked', 'pending', 'total'].every(
          (field) => typeof balance[field as keyof WalletBalance] === 'number' &&
            Number.isFinite(balance[field as keyof WalletBalance]),
        ) || typeof balance.currency !== 'string' || !balance.currency.trim()) {
          throw new Error('The backend returned an invalid wallet balance');
        }
        if (this.ownerToken() !== owner) throw new Error('Wallet account changed during balance request');
        if (generation === this.fetchGeneration) {
          this.balanceCache = balance;
          this.cacheOwner = owner;
          this.lastFetchTime = Date.now();
        }
        return balance;
      })
      .catch((error: unknown) => {
        if (generation === this.fetchGeneration && this.ownerToken() === owner &&
          this.cacheOwner === owner && this.balanceCache) return this.balanceCache;
        throw error;
      })
      .finally(() => {
        if (this.inFlight?.generation === generation) this.inFlight = null;
      });
    this.inFlight = { owner, generation, promise };
    return promise;
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
    if (this.cacheOwner !== this.ownerToken()) this.clearCache();
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
      this.getCachedBalance() !== null &&
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
    this.fetchGeneration += 1;
    this.inFlight = null;
    this.cacheOwner = this.ownerToken();
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
   * Fetch pending multi-signature operations for a wallet address.
   */
  async getPendingMultiSigOperations(
    walletAddress: string
  ): Promise<{ success: boolean; message?: string; operations?: import('@/hooks/useMultiSigApprovals').PendingMultiSigOperation[] }> {
    try {
      const response = await fetch(`/api/wallet/multisig/pending?address=${encodeURIComponent(walletAddress)}`, {
        headers: {
          Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
      });
      const data = await response.json();
      return { success: response.ok, operations: data.data, message: data.message };
    } catch (error) {
      console.error('Error fetching multi-sig operations:', error);
      return { success: false, message: 'Failed to fetch pending operations' };
    }
  }

  /**
   * Submit a signature for a multi-sig operation.
   */
  async signMultiSigOperation(params: {
    operationId: string;
    signature: string;
    signerPublicKey: string;
  }): Promise<{ success: boolean; message?: string; currentSignatures?: number }> {
    try {
      const response = await fetch('/api/wallet/multisig/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
        },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message, currentSignatures: data.currentSignatures };
    } catch (error) {
      console.error('Error signing multi-sig operation:', error);
      return { success: false, message: 'Failed to sign operation' };
    }
  }

}

export const walletService = WalletService.getInstance();
