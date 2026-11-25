/**
 * QrGenerator — offline integration tests
 *
 * Unlike the colocated component tests (which mock the hook), these tests
 * render the real `QrGenerator` with the real `useOfflineQr` hook and only
 * mock the service layer (`shipmentHandoffService` + `qrCacheService`).
 * That exercises the full offline path end to end:
 *
 *  - QR renders from the cached payload while offline
 *  - QR generation falls back to local cached state on network timeout
 *  - Scan confirmation is queued while offline and flagged for sync
 *
 * No inline mock objects in implementation code — mocks live only in tests.
 */

import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QrGenerator } from '@/components/logistics/QrGenerator';
import { shipmentHandoffService } from '@/services/shipmentHandoffService';
import { qrCacheService } from '@/services/qrCacheService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/shipmentHandoffService');
jest.mock('@/services/qrCacheService');
jest.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }: { value: string }) => (
    <canvas data-testid="qr-canvas" data-value={value} />
  ),
}));

const mockService = shipmentHandoffService as jest.Mocked<typeof shipmentHandoffService>;
const mockCache = qrCacheService as jest.Mocked<typeof qrCacheService>;

// ─── Fixture ──────────────────────────────────────────────────────────────────

const DELIVERY_ID = 'del-001';

const cachedPayload = {
  qrData: 'https://example.com/qr/cached-tok',
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  deliveryId: DELIVERY_ID,
  token: 'tok-cached',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

function setupCacheDefaults() {
  mockCache.savePayload.mockResolvedValue(undefined);
  mockCache.getPayload.mockResolvedValue(null);
  mockCache.getPendingConfirmations.mockResolvedValue([]);
  mockCache.pendingCount.mockResolvedValue(0);
  mockCache.queueScanConfirmation.mockResolvedValue(undefined);
  mockCache.removeConfirmation.mockResolvedValue(undefined);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupCacheDefaults();
  setOnline(true);
});

afterEach(() => {
  setOnline(true);
  jest.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('QrGenerator — QR renders from cached payload while offline', () => {
  it('renders the QR canvas from cache when the browser is offline and the API fails', async () => {
    setOnline(false);
    mockService.getHandoffQR.mockRejectedValue(new Error('Network error'));
    mockCache.getPayload.mockResolvedValue(cachedPayload);

    render(<QrGenerator deliveryId={DELIVERY_ID} />);

    await waitFor(() =>
      expect(screen.getByTestId('qr-canvas')).toBeInTheDocument(),
    );

    // The QR encodes the cached payload, not a live one
    expect(screen.getByTestId('qr-canvas')).toHaveAttribute(
      'data-value',
      cachedPayload.qrData,
    );
    // The API was attempted first — the cache is a fallback, not the first resort
    expect(mockService.getHandoffQR).toHaveBeenCalledWith(DELIVERY_ID);
    expect(mockCache.getPayload).toHaveBeenCalledWith(DELIVERY_ID);
  });

  it('shows the "Cached" badge and offline notice when rendering from cache', async () => {
    setOnline(false);
    mockService.getHandoffQR.mockRejectedValue(new Error('Network error'));
    mockCache.getPayload.mockResolvedValue(cachedPayload);

    render(<QrGenerator deliveryId={DELIVERY_ID} />);

    await waitFor(() =>
      expect(
        screen.getByLabelText('QR code loaded from local cache'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Offline — showing cached QR/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText('QR code loaded from live API'),
    ).not.toBeInTheDocument();
  });
});

describe('QrGenerator — fallback to local state on network timeout', () => {
  it('falls back to the cached payload when the network request times out', async () => {
    jest.useFakeTimers();
    try {
      // API hangs — resolves only after 10 s, past the hook's 5 s timeout
      mockService.getHandoffQR.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(cachedPayload), 10_000),
          ),
      );
      mockCache.getPayload.mockResolvedValue(cachedPayload);

      render(<QrGenerator deliveryId={DELIVERY_ID} />);

      act(() => {
        jest.advanceTimersByTime(6_000);
      });
    } finally {
      jest.useRealTimers();
    }

    await waitFor(() =>
      expect(
        screen.getByLabelText('QR code loaded from local cache'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId('qr-canvas')).toHaveAttribute(
      'data-value',
      cachedPayload.qrData,
    );
    expect(screen.getByText(/Offline — showing cached QR/i)).toBeInTheDocument();
  });
});

describe('QrGenerator — scan confirmation queued while offline', () => {
  it('queues the scan confirmation and flags it for sync when offline', async () => {
    setOnline(false);
    mockService.getHandoffQR.mockRejectedValue(new Error('Network error'));
    mockCache.getPayload.mockResolvedValue(cachedPayload);
    // Nothing pending at load; one confirmation pending after queueing
    mockCache.pendingCount
      .mockResolvedValueOnce(0)
      .mockResolvedValue(1);

    render(<QrGenerator deliveryId={DELIVERY_ID} />);

    await waitFor(() =>
      expect(screen.getByTestId('qr-canvas')).toBeInTheDocument(),
    );
    // No sync badge before any scan is confirmed
    expect(screen.queryByLabelText(/queued for sync/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-scan-button'));

    await waitFor(() =>
      expect(mockCache.queueScanConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: DELIVERY_ID,
          token: 'tok-cached',
        }),
      ),
    );

    // Flagged for sync: the badge reports the pending confirmation
    await waitFor(() =>
      expect(
        screen.getByLabelText('1 scan confirmation queued for sync'),
      ).toBeInTheDocument(),
    );
    // Offline means no immediate sync attempt against the backend
    expect(mockService.verifyHandoffQR).not.toHaveBeenCalled();
  });

  it('flushes the queued confirmation once the browser comes back online', async () => {
    setOnline(false);
    mockService.getHandoffQR.mockRejectedValue(new Error('Network error'));
    mockCache.getPayload.mockResolvedValue(cachedPayload);
    mockService.verifyHandoffQR.mockResolvedValue({
      id: 'v1',
      deliveryId: DELIVERY_ID,
      token: 'tok-cached',
      expiresAt: cachedPayload.expiresAt,
      createdAt: new Date().toISOString(),
    });
    mockCache.getPendingConfirmations.mockResolvedValue([
      {
        key: 1,
        value: {
          deliveryId: DELIVERY_ID,
          token: 'tok-cached',
          scannedAt: new Date().toISOString(),
        },
      },
    ]);
    mockCache.pendingCount.mockResolvedValue(0);

    render(<QrGenerator deliveryId={DELIVERY_ID} />);

    await waitFor(() =>
      expect(screen.getByTestId('qr-canvas')).toBeInTheDocument(),
    );

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() =>
      expect(mockService.verifyHandoffQR).toHaveBeenCalledWith(
        DELIVERY_ID,
        'tok-cached',
      ),
    );
    expect(mockCache.removeConfirmation).toHaveBeenCalledWith(1);
  });
});

describe('QrGenerator — live path (control)', () => {
  it('renders the live QR and caches the payload when the API succeeds', async () => {
    mockService.getHandoffQR.mockResolvedValue(cachedPayload);

    render(<QrGenerator deliveryId={DELIVERY_ID} />);

    await waitFor(() =>
      expect(screen.getByTestId('qr-canvas')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('qr-canvas')).toHaveAttribute(
      'data-value',
      cachedPayload.qrData,
    );
    expect(
      screen.getByLabelText('QR code loaded from live API'),
    ).toBeInTheDocument();
    expect(mockCache.savePayload).toHaveBeenCalledWith(cachedPayload);
  });

  it('shows an error when the API fails and no cached payload exists', async () => {
    mockService.getHandoffQR.mockRejectedValue(new Error('Network error'));
    mockCache.getPayload.mockResolvedValue(null);

    render(<QrGenerator deliveryId={DELIVERY_ID} />);

    await waitFor(() =>
      expect(screen.getByTestId('qr-error')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Unable to load QR/i)).toBeInTheDocument();
    expect(screen.queryByTestId('qr-canvas')).not.toBeInTheDocument();
  });
});
