import axios from 'axios';
import { TransactionResponse } from '@/types/transaction';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const STELLAR_TESTNET_EXPLORER = 'https://testnet.steexp.com/tx/';
const STELLAR_PUBLIC_EXPLORER = 'https://steexp.com/tx/';

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
 */
export const walletService = {
  /**
   * Registers the Freighter wallet session with the backend.
   * The backend verifies the public key and returns a confirmed session.
   */
  async connect(publicKey: string): Promise<ConnectResponse> {
    const { data } = await axios.post<ConnectResponse>(
      `${API_BASE_URL}/api/wallet/connect`,
      { publicKey }
    );
    return data;
  },

  async disconnect(): Promise<DisconnectResponse> {
    const { data } = await axios.post<DisconnectResponse>(
      `${API_BASE_URL}/api/wallet/disconnect`
    );
    return data;
  },

  /**
   * Fetch the XLM balance for the given wallet address from the backend.
   * The backend is the single source of truth — no Stellar SDK calls in the browser.
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    const { data } = await axios.get<BalanceResponse>(
      `${API_BASE_URL}/api/wallet/balance`,
      { params: { address } }
    );
    return data;
  },

  /**
   * Poll the backend for the transaction status.
   * Returns current status and Stellar explorer URL.
   * Backend queries Horizon to determine if transaction was confirmed.
   */
  async getTransactionStatus(transactionHash: string): Promise<TransactionResponse> {
    const { data } = await axios.get<TransactionResponse>(
      `${API_BASE_URL}/api/wallet/transaction/${transactionHash}`
    );
    
    // Append explorer URL based on network
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
    const explorerBase = network === 'public' ? STELLAR_PUBLIC_EXPLORER : STELLAR_TESTNET_EXPLORER;
    
    return {
      ...data,
      stellarExplorerUrl: `${explorerBase}${transactionHash}`,
    };
  },
};