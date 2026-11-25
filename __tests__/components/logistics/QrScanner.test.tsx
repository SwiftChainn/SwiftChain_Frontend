import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QrScanner } from '../../../components/logistics/QrScanner';
import { GlobalErrorBoundary } from '../../../components/shared/GlobalErrorBoundary';
import { qrScannerService } from '../../../services/qrScannerService';
import { errorLoggerService } from '../../../services/errorLoggerService';
import * as useQrScannerModule from '../../../hooks/useQrScanner';
import { mockVerifyResponse } from '../../__mocks__/qrScannerMockData';

// Mock the API service
jest.mock('../../../services/qrScannerService');

// Mock the error logger service so the boundary's reporting call never hits the network
jest.mock('@/services/errorLoggerService', () => ({
  errorLoggerService: {
    logReactError: jest.fn().mockResolvedValue({
      success: true,
      errorId: 'test-error-id',
    }),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      
    },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('QrScanner - Camera Permissions', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    // Mock HTMLMediaElement.prototype.play to prevent jsdom error
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    
    // Setup generic mock for mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn(),
      },
    });
    
    // Default successful API response (adhering to "No Inline Mock Objects")
    (qrScannerService.verifyQrCode as jest.Mock).mockResolvedValue(mockVerifyResponse);
  });

  afterEach(() => {
    // Restore original mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: originalMediaDevices,
    });
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('renders "Camera Permission Denied" fallback explicitly when the mock API rejects the promise', async () => {
    // Mock getUserMedia to reject with a NotAllowedError
    const permissionDeniedError = new Error('Permission denied');
    permissionDeniedError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(permissionDeniedError);

    renderWithClient(<QrScanner />);

    // Verify fallback error message is shown with clear instructions
    await waitFor(() => {
      expect(screen.getByText(/Camera Permission Denied: Please enable camera access in your browser settings./i)).toBeInTheDocument();
    });

    // Ensure the fallback alert UI is explicitly rendered (has alert role)
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });
  
  it('successfully initializes the camera when permissions are granted', async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    renderWithClient(<QrScanner />);

    // Wait for the video element to be visible/active
    await waitFor(() => {
      const video = screen.getByTestId('qr-video-element');
      expect(video).toHaveClass('opacity-100');
    });

    // Ensure no error message is shown
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a distinct "No camera device found" fallback for NotFoundError', async () => {
    const noDeviceError = new Error('Requested device not found');
    noDeviceError.name = 'NotFoundError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(noDeviceError);

    renderWithClient(<QrScanner />);

    await waitFor(() => {
      expect(screen.getByText(/No camera device found\./i)).toBeInTheDocument();
    });

    // This must be distinguishable from the permission-denied fallback
    expect(screen.queryByText(/Camera Permission Denied/i)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a generic failure fallback for unexpected getUserMedia errors', async () => {
    const unexpectedError = new Error('Something went wrong');
    unexpectedError.name = 'AbortError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(unexpectedError);

    renderWithClient(<QrScanner />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to access camera\./i)).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('recovers and initializes the camera after retrying from a permission-denied state', async () => {
    const permissionDeniedError = new Error('Permission denied');
    permissionDeniedError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(permissionDeniedError);

    renderWithClient(<QrScanner />);

    await waitFor(() => {
      expect(screen.getByText(/Camera Permission Denied/i)).toBeInTheDocument();
    });

    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      const video = screen.getByTestId('qr-video-element');
      expect(video).toHaveClass('opacity-100');
    });

    // The permission-denied fallback must clear once the camera recovers
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('QrScanner - Error Boundary & Failure Handling', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    // Mock HTMLMediaElement.prototype.play to prevent jsdom error
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);

    // Setup generic mock for mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn(),
      },
    });

    // Default successful API response (adhering to "No Inline Mock Objects")
    (qrScannerService.verifyQrCode as jest.Mock).mockResolvedValue(mockVerifyResponse);
  });

  afterEach(() => {
    // Restore original mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: originalMediaDevices,
    });
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('shows an instructional message directing the driver to browser settings when camera permission is denied', async () => {
    const permissionDeniedError = new Error('Permission denied');
    permissionDeniedError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(permissionDeniedError);

    renderWithClient(<QrScanner />);

    // The fallback names the problem explicitly
    await waitFor(() => {
      expect(screen.getByText(/Camera Permission Denied/i)).toBeInTheDocument();
    });

    // ...and tells the driver exactly what to do about it
    expect(screen.getByText(/enable camera access in your browser settings/i)).toBeInTheDocument();

    // The driver can retry once they have fixed the permission
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('surfaces a clean failure fallback instead of crashing when getUserMedia throws synchronously', async () => {
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockImplementation(() => {
      throw new Error('getUserMedia threw synchronously');
    });

    renderWithClient(<QrScanner />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to access camera\./i)).toBeInTheDocument();
    });

    // The page stays up: the scanner chrome and video element are still mounted
    expect(screen.getByText('QR Code Scanner')).toBeInTheDocument();
    expect(screen.getByTestId('qr-video-element')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('surfaces a clean failure fallback instead of crashing when mediaDevices is unavailable', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: undefined,
    });

    renderWithClient(<QrScanner />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to access camera\./i)).toBeInTheDocument();
    });

    // The page stays up: the scanner chrome and video element are still mounted
    expect(screen.getByText('QR Code Scanner')).toBeInTheDocument();
    expect(screen.getByTestId('qr-video-element')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('surfaces a clean failure fallback instead of crashing when video playback fails after permission is granted', async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);
    window.HTMLMediaElement.prototype.play = jest
      .fn()
      .mockRejectedValue(new Error('Video playback failed'));

    renderWithClient(<QrScanner />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to access camera\./i)).toBeInTheDocument();
    });

    // The page stays up: the scanner chrome and video element are still mounted
    expect(screen.getByText('QR Code Scanner')).toBeInTheDocument();
    expect(screen.getByTestId('qr-video-element')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the error boundary fallback instead of crashing the page when the scanner fails during render', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onError = jest.fn();
    const hookSpy = jest.spyOn(useQrScannerModule, 'useQrScanner').mockImplementation(() => {
      throw new Error('Scanner render failure');
    });

    try {
      render(
        <QueryClientProvider client={queryClient}>
          <GlobalErrorBoundary onError={onError}>
            <QrScanner />
          </GlobalErrorBoundary>
        </QueryClientProvider>
      );

      // The boundary fallback replaces the crashed scanner
      expect(await screen.findByText(/Oops! Something went wrong/i)).toBeInTheDocument();
      expect(screen.queryByText('QR Code Scanner')).not.toBeInTheDocument();

      // The boundary reports the failure instead of letting it crash the page
      expect(errorLoggerService.logReactError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    } finally {
      hookSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });

  it('renders the scanner normally inside the error boundary when the camera initializes successfully', async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }],
    };
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce(mockStream);

    render(
      <QueryClientProvider client={queryClient}>
        <GlobalErrorBoundary>
          <QrScanner />
        </GlobalErrorBoundary>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const video = screen.getByTestId('qr-video-element');
      expect(video).toHaveClass('opacity-100');
    });

    // The boundary stays out of the way on the healthy path
    expect(screen.queryByText(/Oops! Something went wrong/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
