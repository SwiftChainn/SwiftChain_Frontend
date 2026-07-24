import api from '@/lib/api';
import { TransactionResponse } from '@/types/transaction';

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

export interface WalletConnectResponse {
  success: boolean;
  publicKey: string;
  message?: string;
}

/**
 * Resolves the Stellar blockchain explorer URL for a given transaction hash.
 * Handles testnet and public network environments.
 */
function buildStellarExplorerUrl(transactionHash: string): string {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  const subdomain = network === 'public' ? '' : 'testnet.';
  return `https://${subdomain}steexp.com/tx/${transactionHash}`;
}

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

  // ─── Wallet Session ────────────────────────────────────────────────────────

  /**
   * Register a Stellar public key with the backend, establishing a wallet session.
   */
  async connect(publicKey: string): Promise<WalletConnectResponse> {
    const response = await api.post<WalletConnectResponse>('/wallet/connect', { publicKey });
    return response.data;
  }

  /**
   * Invalidate the current wallet session on the backend.
   */
  async disconnect(): Promise<void> {
    await api.post('/wallet/disconnect');
  }

  // ─── Balance ───────────────────────────────────────────────────────────────

  /**
   * Fetch wallet balance from the backend API.
   * Uses an in-memory cache to reduce unnecessary round-trips.
   */
  async fetchBalance(forceRefresh = false): Promise<WalletBalance> {
    if (!forceRefresh && this.isCacheValid()) {
      return this.balanceCache!;
    }

    const response = await api.get<{ data: WalletBalance }>('/wallet/balance');
    const data = response.data.data;

    const balance: WalletBalance = {
      available: data.available ?? 0,
      locked: data.locked ?? 0,
      pending: data.pending ?? 0,
      total: data.total ?? 0,
      currency: data.currency ?? 'USD',
    };

    this.balanceCache = balance;
    this.lastFetchTime = Date.now();

    return balance;
  }

  /**
   * Convenience alias used by useWallet and useWalletBalance hooks.
   */
  async getBalance(): Promise<WalletBalance> {
    return this.fetchBalance();
  }

  /**
   * Determine whether the wallet holds sufficient funds for a transaction.
   */
  async checkSufficientBalance(requiredAmount: number): Promise<BalanceCheckResult> {
    const balance = await this.fetchBalance();
    return {
      hasSufficientBalance: balance.available >= requiredAmount,
      balance,
      requiredAmount,
    };
  }

  /**
   * Synchronously return the cached balance (useful for optimistic UI).
   */
  getCachedBalance(): WalletBalance | null {
    return this.balanceCache;
  }

  /**
   * Warm the cache ahead of time.
   */
  async prefetchBalance(): Promise<void> {
    try {
      await this.fetchBalance();
    } catch {
      // Silently fail — we will try again on the next consumer request.
    }
  }

  /**
   * Invalidate the balance cache (e.g. on logout or after a transaction).
   */
  clearCache(): void {
    this.balanceCache = null;
    this.lastFetchTime = 0;
  }

  // ─── Transaction Status ────────────────────────────────────────────────────

  /**
   * Fetch the current status of a blockchain transaction from the backend.
   *
   * The backend proxies the Soroban RPC and returns a normalised
   * `TransactionResponse` shape.  The service layer also appends the
   * Stellar Explorer URL so callers never have to construct it themselves.
   *
   * @param transactionHash - The 64-character Stellar transaction hash.
   * @returns Fully-populated `TransactionResponse` including `stellarExplorerUrl`.
   * @throws When the network request fails or the backend returns a non-2xx status.
   */
  async getTransactionStatus(transactionHash: string): Promise<TransactionResponse> {
    const response = await api.get<TransactionResponse>(
      `/api/wallet/transaction/${transactionHash}`
    );

    const data = response.data;

    // Always hydrate the explorer URL from this layer so consumers are
    // decoupled from URL-construction logic.
    return {
      ...data,
      stellarExplorerUrl:
        data.stellarExplorerUrl ?? buildStellarExplorerUrl(transactionHash),
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private isCacheValid(): boolean {
    return (
      this.balanceCache !== null &&
      Date.now() - this.lastFetchTime < this.CACHE_DURATION
    );
  }
}

export const walletService = WalletService.getInstance();
