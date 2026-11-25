import { render, screen, act } from '@testing-library/react';
import OfflineBanner from '@/components/ui/OfflineBanner';
import useOffline from '@/hooks/useOffline';
import { networkService } from '@/services/networkService';

jest.mock('@/hooks/useOffline');
jest.mock('@/services/networkService', () => ({
  networkService: {
    getIsOnline: jest.fn(),
    checkConnectivity: jest.fn(),
  },
}));

const mockedUseOffline = useOffline as jest.Mock;
const mockedNetworkService = networkService as jest.Mocked<
  typeof networkService
>;

/**
 * The real hook, bypassing the automock of '@/hooks/useOffline' above, so
 * the integration tests below exercise the actual window 'online' /
 * 'offline' listeners, the generation counter and the 2-second success
 * timer through the rendered banner. The mock wrapper still calls the
 * hook during the component's render, so hook rules still hold.
 */
const realUseOffline = jest.requireActual('@/hooks/useOffline')
  .default as typeof useOffline;

/** Resolves once all pending microtasks have flushed (safe under fake timers). */
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing while online and no success flash is pending', () => {
    mockedUseOffline.mockReturnValue({ isOnline: true, showBackOnline: false });

    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the offline message while disconnected', () => {
    mockedUseOffline.mockReturnValue({ isOnline: false, showBackOnline: false });

    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(/currently offline/i);
  });

  it('shows the "Back Online!" success state', () => {
    mockedUseOffline.mockReturnValue({ isOnline: true, showBackOnline: true });

    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);
  });
});

describe('OfflineBanner with the real useOffline hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (mockedNetworkService.getIsOnline as jest.Mock).mockReturnValue(true);
    (mockedNetworkService.checkConnectivity as jest.Mock).mockResolvedValue(
      true
    );
    mockedUseOffline.mockImplementation(() => realUseOffline());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the offline banner immediately on disconnect, then the "Back Online!" state promptly on reconnect', async () => {
    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();

    // Disconnect: the banner must appear immediately, with no backend
    // verification gating it.
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );
    expect(mockedNetworkService.checkConnectivity).not.toHaveBeenCalled();

    // Reconnect: once the backend reachability check resolves, the banner
    // must switch to the success state promptly (within the 1-second
    // acceptance margin).
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(mockedNetworkService.checkConnectivity).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);
  });

  it('keeps the "Back Online!" success state for 2 seconds, then fully unmounts the banner', async () => {
    const { container } = render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);

    // Still visible just before the 2-second mark...
    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);

    // ...and gone once the 2 seconds elapse.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('ignores a stale verification result when the network flaps (generation counter)', async () => {
    let resolveFirstCheck: (_value: boolean) => void = () => {};
    const firstCheck = new Promise<boolean>((resolve) => {
      resolveFirstCheck = resolve;
    });
    (mockedNetworkService.checkConnectivity as jest.Mock).mockReturnValueOnce(
      firstCheck
    );

    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );

    // Network flaps online -> offline before the first verification resolves.
    act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );

    // The stale "online" check finally resolves true — the generation
    // counter must have superseded it, so no success state may appear.
    await act(async () => {
      resolveFirstCheck(true);
      await flushMicrotasks();
    });

    expect(screen.queryByText(/back online!/i)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );
  });

  it('cancels the "Back Online!" state immediately if the connection drops again', async () => {
    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });
    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);

    // A new offline event bumps the generation counter and must remove the
    // success state at once — the banner goes back to the offline message.
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );

    // The cancelled success timer must not hide the offline banner later.
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );
  });

  it('does not flash the "Back Online!" banner for an online event while already online', async () => {
    const { container } = render(<OfflineBanner />);

    expect(container).toBeEmptyDOMElement();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the success state on reconnect after mounting while offline', async () => {
    (mockedNetworkService.getIsOnline as jest.Mock).mockReturnValue(false);

    render(<OfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(
      /currently offline/i
    );

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await flushMicrotasks();
    });

    expect(screen.getByRole('status')).toHaveTextContent(/back online!/i);
  });
});
