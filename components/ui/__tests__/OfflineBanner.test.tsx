/**
 * OfflineBanner component tests
 *
 * The banner is exercised through its real architecture:
 *   OfflineBanner (Component) → useOffline (Hook) → networkService (Service)
 *
 * Only the service boundary (the backend connectivity check) is mocked, so the
 * 1-second auto-dismiss behaviour is tested end-to-end rather than stubbed at
 * the hook.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { networkService } from '@/services/networkService';

jest.mock('@/services/networkService', () => ({
  networkService: {
    getIsOnline: jest.fn(),
    checkConnectivity: jest.fn(),
  },
}));

const mockedNetworkService = networkService as jest.Mocked<typeof networkService>;

/** Resolves once all pending microtasks have flushed (safe under fake timers). */
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedNetworkService.checkConnectivity.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while online and no success flash is pending', () => {
    mockedNetworkService.getIsOnline.mockReturnValue(true);

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the offline message while disconnected', () => {
    mockedNetworkService.getIsOnline.mockReturnValue(false);

    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(/currently offline/i);
  });

  it('shows the "Back Online!" success state after a verified reconnect', async () => {
    mockedNetworkService.getIsOnline.mockReturnValue(false);
    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(/currently offline/i);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(mockedNetworkService.checkConnectivity).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);
  });

  it('unmounts within 1 second of reconnection', async () => {
    mockedNetworkService.getIsOnline.mockReturnValue(false);
    const { container } = render(<OfflineBanner />);

    // Start offline.
    expect(screen.getByRole('status')).toHaveTextContent(/currently offline/i);

    // Reconnect — the interface is reachable again.
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);

    // Just before the 1 second deadline the banner is still mounted.
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    // At the 1 second mark it must be gone from the DOM.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('stays offline when the backend reachability check fails', async () => {
    mockedNetworkService.getIsOnline.mockReturnValue(false);
    mockedNetworkService.checkConnectivity.mockResolvedValue(false);

    render(<OfflineBanner />);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(screen.getByRole('status')).toHaveTextContent(/currently offline/i);

    // No success flash timer should have been scheduled.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/currently offline/i);
  });
});
