import { walletService } from '@/services/walletService';
import { TransactionResponse } from '@/types/transaction';
import api from '@/lib/api';

// The service uses the shared `api` axios instance, not bare `axios`.
jest.mock('@/lib/api');

const mockApi = api as jest.Mocked<typeof api>;

const MOCK_TX_HASH = 'c670b91e8c2d91e4cf6bae2f6a6373a3b64e3c8ce73f3c2b6a5d8f9e4c3b2a1';

// Reset env overrides after all tests.
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
  };
});
afterAll(() => {
  process.env = originalEnv;
});

describe('walletService - Transaction Polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure we always start from a clean testnet env.
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
  });

  describe('getTransactionStatus', () => {
    it('should fetch transaction status from the correct endpoint', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
        confirmations: 1,
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      const callUrl = (mockApi.get as jest.Mock).mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/wallet/transaction/');
      expect(callUrl).toContain(MOCK_TX_HASH);
      expect(result.status).toBe('SUCCESS');
    });

    it('should append the Stellar Explorer URL for testnet', async () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';

      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('testnet.steexp.com');
      expect(result.stellarExplorerUrl).toContain(MOCK_TX_HASH);
    });

    it('should handle PENDING status', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting for confirmation',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.status).toBe('PENDING');
      expect(result.message).toBe('Waiting for confirmation');
    });

    it('should handle SUCCESS status', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed successfully',
        confirmations: 3,
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.status).toBe('SUCCESS');
      expect(result.confirmations).toBe(3);
    });

    it('should handle FAILED status with errorMessage', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        message: 'Transaction failed',
        errorMessage: 'Insufficient balance',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('Insufficient balance');
    });

    it('should handle CONFIRMED status', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'CONFIRMED',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.status).toBe('CONFIRMED');
    });

    it('should preserve all metadata fields in the response', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: '2024-01-15T10:30:00Z',
        message: 'Transaction confirmed',
        confirmations: 5,
        amount: 100,
        destination: 'GBRPYHIL2CI3WHZDTOOQFC6EB4CGQWF53KTTNCLH34SBEKNQEWJPIN7',
        source: 'GBBD47UZQ2YPJYAUQQ4EJVLLREOIT2U7ILVJSXPOLZMLLNIC5OHSTPO3',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.amount).toBe(100);
      expect(result.destination).toBeDefined();
      expect(result.source).toBeDefined();
      expect(result.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(result.confirmations).toBe(5);
    });

    it('should throw on network failure', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      await expect(walletService.getTransactionStatus(MOCK_TX_HASH)).rejects.toThrow(
        'Network error'
      );
    });

    it('should throw on HTTP 404', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 404, data: { error: 'Transaction not found' } },
      });

      await expect(walletService.getTransactionStatus(MOCK_TX_HASH)).rejects.toBeDefined();
    });

    it('should throw on HTTP 500', async () => {
      mockApi.get.mockRejectedValue({
        response: { status: 500, data: { error: 'Internal server error' } },
      });

      await expect(walletService.getTransactionStatus(MOCK_TX_HASH)).rejects.toBeDefined();
    });

    it('should include the transaction hash in the constructed URL', async () => {
      const customHash = 'abcdef1234567890';
      const mockResponse: TransactionResponse = {
        transactionHash: customHash,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      await walletService.getTransactionStatus(customHash);

      const callUrl = (mockApi.get as jest.Mock).mock.calls[0][0] as string;
      expect(callUrl).toContain(customHash);
    });

    it('should return a response with all required fields', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result).toHaveProperty('transactionHash');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('stellarExplorerUrl');
    });

    it('should prefer a backend-provided stellarExplorerUrl over the generated one', async () => {
      const backendUrl = 'https://custom-explorer.example.com/tx/' + MOCK_TX_HASH;
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
        stellarExplorerUrl: backendUrl,
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toBe(backendUrl);
    });

    it('should maintain backward compatibility: connect, disconnect, getBalance exist', () => {
      expect(typeof walletService.connect).toBe('function');
      expect(typeof walletService.disconnect).toBe('function');
      expect(typeof walletService.getBalance).toBe('function');
      expect(typeof walletService.getTransactionStatus).toBe('function');
    });
  });

  describe('Explorer URL generation', () => {
    it('should use the testnet subdomain for the testnet network', async () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';

      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('testnet.steexp.com');
    });

    it('should omit the testnet subdomain for the public network', async () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public';

      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('steexp.com');
      expect(result.stellarExplorerUrl).not.toContain('testnet');
    });

    it('should embed the transaction hash in the explorer URL', async () => {
      const longHash = 'a'.repeat(64);
      const mockResponse: TransactionResponse = {
        transactionHash: longHash,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(longHash);

      expect(result.stellarExplorerUrl).toContain(longHash);
    });

    it('should default to testnet when NEXT_PUBLIC_STELLAR_NETWORK is not set', async () => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;

      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('testnet.steexp.com');
    });
  });

  describe('API Response handling', () => {
    it('should preserve all fields from the backend response', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: '2024-01-15T10:30:00Z',
        message: 'Confirmed',
        confirmations: 10,
        amount: 500,
        destination: 'DEST_ADDRESS',
        source: 'SRC_ADDRESS',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.transactionHash).toBe(MOCK_TX_HASH);
      expect(result.status).toBe('SUCCESS');
      expect(result.confirmations).toBe(10);
      expect(result.amount).toBe(500);
    });

    it('should handle a minimal response (only required fields)', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting',
      };

      mockApi.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.transactionHash).toBe(MOCK_TX_HASH);
      expect(result.status).toBe('PENDING');
      expect(result.stellarExplorerUrl).toBeDefined();
      expect(result.stellarExplorerUrl?.length).toBeGreaterThan(0);
    });
  });
});
