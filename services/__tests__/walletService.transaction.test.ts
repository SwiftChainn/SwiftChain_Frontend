import axios from 'axios';
import { walletService } from '@/services/walletService';
import { TransactionResponse } from '@/types/transaction';

// Mock axios
jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

const MOCK_TX_HASH = 'c670b91e8c2d91e4cf6bae2f6a6373a3b64e3c8ce73f3c2b6a5d8f9e4c3b2a1';
const API_BASE_URL = 'http://localhost:3000';

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_API_URL: API_BASE_URL,
    NEXT_PUBLIC_STELLAR_NETWORK: 'testnet',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('walletService - Transaction Polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactionStatus', () => {
    it('should fetch transaction status from correct endpoint', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
        confirmations: 1,
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      // The endpoint path should match the service call
      expect(mockAxios.get).toHaveBeenCalled();
      const callArgs = mockAxios.get.mock.calls[0][0] as string;
      expect(callArgs).toContain('/api/wallet/transaction/');
      expect(callArgs).toContain(MOCK_TX_HASH);
      expect(result.status).toBe('SUCCESS');
    });

    it('should append correct explorer URL for testnet', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Transaction confirmed',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

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

      mockAxios.get.mockResolvedValue({ data: mockResponse });

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

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.status).toBe('SUCCESS');
      expect(result.confirmations).toBe(3);
    });

    it('should handle FAILED status', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        message: 'Transaction failed',
        errorMessage: 'Insufficient balance',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

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

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.status).toBe('CONFIRMED');
    });

    it('should include transaction metadata in response', async () => {
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

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.amount).toBe(100);
      expect(result.destination).toBeDefined();
      expect(result.source).toBeDefined();
      expect(result.timestamp).toBe('2024-01-15T10:30:00Z');
    });

    it('should throw error on network failure', async () => {
      const errorMessage = 'Network error';
      mockAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(
        walletService.getTransactionStatus(MOCK_TX_HASH)
      ).rejects.toThrow(errorMessage);
    });

    it('should throw error on 404 response', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 404, data: { error: 'Transaction not found' } },
      });

      await expect(
        walletService.getTransactionStatus(MOCK_TX_HASH)
      ).rejects.toBeDefined();
    });

    it('should throw error on 500 response', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 500, data: { error: 'Internal server error' } },
      });

      await expect(
        walletService.getTransactionStatus(MOCK_TX_HASH)
      ).rejects.toBeDefined();
    });

    it('should construct correct URL with transaction hash', async () => {
      const customHash = 'abcdef1234567890';
      const mockResponse: TransactionResponse = {
        transactionHash: customHash,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await walletService.getTransactionStatus(customHash);

      expect(mockAxios.get).toHaveBeenCalled();
      const callArgs = mockAxios.get.mock.calls[0][0] as string;
      expect(callArgs).toContain('/api/wallet/transaction/');
      expect(callArgs).toContain(customHash);
    });

    it('should return result with all required fields', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result).toHaveProperty('transactionHash');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('stellarExplorerUrl');
    });

    it('should maintain backward compatibility with existing wallet service methods', async () => {
      // Verify that existing methods are still callable
      expect(typeof walletService.connect).toBe('function');
      expect(typeof walletService.disconnect).toBe('function');
      expect(typeof walletService.getBalance).toBe('function');
      expect(typeof walletService.getTransactionStatus).toBe('function');
    });
  });

  describe('Explorer URL Generation', () => {
    it('should use testnet explorer for testnet network', async () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
      
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('testnet.steexp.com');
    });

    it('should use public explorer for public network', async () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public';
      
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('steexp.com');
      expect(result.stellarExplorerUrl).not.toContain('testnet');
    });

    it('should include transaction hash in explorer URL', async () => {
      const customHash = 'a'.repeat(64);
      const mockResponse: TransactionResponse = {
        transactionHash: customHash,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(customHash);

      expect(result.stellarExplorerUrl).toContain(customHash);
    });

    it('should default to testnet if network env var is not set', async () => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
      
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        message: 'Success',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.stellarExplorerUrl).toContain('testnet.steexp.com');
    });
  });

  describe('API Response Handling', () => {
    it('should preserve all response fields', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'SUCCESS',
        timestamp: '2024-01-15T10:30:00Z',
        message: 'Confirmed',
        confirmations: 10,
        amount: 500,
        destination: 'DEST_ADDRESS',
        source: 'SRC_ADDRESS',
        errorMessage: undefined,
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.transactionHash).toBe(MOCK_TX_HASH);
      expect(result.status).toBe('SUCCESS');
      expect(result.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(result.message).toBe('Confirmed');
      expect(result.confirmations).toBe(10);
      expect(result.amount).toBe(500);
    });

    it('should handle response with minimal fields', async () => {
      const mockResponse: TransactionResponse = {
        transactionHash: MOCK_TX_HASH,
        status: 'PENDING',
        timestamp: new Date().toISOString(),
        message: 'Waiting',
      };

      mockAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await walletService.getTransactionStatus(MOCK_TX_HASH);

      expect(result.transactionHash).toBe(MOCK_TX_HASH);
      expect(result.status).toBe('PENDING');
      expect(result.stellarExplorerUrl).toBeDefined();
    });
  });
});
