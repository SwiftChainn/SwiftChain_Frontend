import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HandoffQR } from '../HandoffQR';
import * as shipmentHandoffService from '../../../services/shipmentHandoffService';

// Mock dependencies
jest.mock('../../../services/shipmentHandoffService');
jest.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock QRCode.react
jest.mock('qrcode.react', () => {
  return function MockQRCode({ value, size }: { value: string; size: number }) {
    return <div data-testid="qr-code-canvas" data-value={value} data-size={size} />;
  };
});

const mockHandoffQRData = {
  qrData: 'https://example.com/qr/token123',
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  deliveryId: 'del-123',
  token: 'token123',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe('HandoffQR Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('Loading State', () => {
    it('should display loading skeleton initially', () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<HandoffQR deliveryId="del-123" />);

      expect(screen.getByText('Generating QR code...')).toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should render QR code when data loads successfully', async () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" includeLabel={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('qr-code-canvas')).toBeInTheDocument();
      });

      expect(screen.getByText('Package Handoff QR')).toBeInTheDocument();
      expect(screen.getByText(/Delivery ID: del-123/)).toBeInTheDocument();
    });

    it('should display expiry time', async () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" includeLabel={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Expires in:/)).toBeInTheDocument();
      });
    });

    it('should render with custom size', async () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" size={512} />);

      await waitFor(() => {
        const qrCanvas = screen.getByTestId('qr-code-canvas');
        expect(qrCanvas).toHaveAttribute('data-size', '512');
      });
    });

    it('should render refresh button', async () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-qr-button')).toBeInTheDocument();
      });
    });

    it('should call onQRGenerated callback when data loads', async () => {
      const onQRGenerated = jest.fn();
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(
        <HandoffQR deliveryId="del-123" onQRGenerated={onQRGenerated} />
      );

      await waitFor(() => {
        expect(onQRGenerated).toHaveBeenCalledWith(mockHandoffQRData);
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      const mockError = new Error('Network error');
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockRejectedValue(mockError);

      renderWithProviders(<HandoffQR deliveryId="del-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to generate QR code')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      const mockError = new Error('Network error');
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByTestId('qr-code-canvas')).toBeInTheDocument();
      });
    });

    it('should call onError callback when error occurs', async () => {
      const mockError = new Error('Generation failed');
      const onError = jest.fn();
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockRejectedValue(mockError);

      renderWithProviders(
        <HandoffQR deliveryId="del-123" onError={onError} />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('Auto-Generate', () => {
    it('should auto-generate QR when autoGenerate is true', async () => {
      const mockGenerateHandoffQR = jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'generateHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(
        <HandoffQR deliveryId="del-123" driverId="drv-456" autoGenerate={true} />
      );

      await waitFor(() => {
        expect(mockGenerateHandoffQR).toHaveBeenCalledWith('del-123');
      });
    });

    it('should not auto-generate when driverId is missing', async () => {
      const mockGenerateHandoffQR = jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'generateHandoffQR');

      renderWithProviders(
        <HandoffQR deliveryId="del-123" autoGenerate={true} />
      );

      // Wait a bit to ensure function wasn't called
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGenerateHandoffQR).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Button', () => {
    it('should generate new QR when refresh button is clicked', async () => {
      const mockGenerateHandoffQR = jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'generateHandoffQR')
        .mockResolvedValue(mockHandoffQRData);
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('refresh-qr-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('refresh-qr-button'));

      await waitFor(() => {
        expect(mockGenerateHandoffQR).toHaveBeenCalledWith('del-123');
      });
    });
  });

  describe('Label Display', () => {
    it('should not display label when includeLabel is false', async () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" includeLabel={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Package Handoff QR')).not.toBeInTheDocument();
      });
    });

    it('should display label when includeLabel is true', async () => {
      jest.spyOn(shipmentHandoffService.shipmentHandoffService, 'getHandoffQR')
        .mockResolvedValue(mockHandoffQRData);

      renderWithProviders(<HandoffQR deliveryId="del-123" includeLabel={true} />);

      await waitFor(() => {
        expect(screen.getByText('Package Handoff QR')).toBeInTheDocument();
      });
    });
  });
});
