import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { render, screen, act } from '@testing-library/react';
import { NetworkWarning } from '@/components/wallet/NetworkWarning';
import { networkService } from '@/services/networkService';

jest.mock('@/services/networkService', () => ({
  networkService: {
    getWalletNetwork: jest.fn(),
  },
}));

const mockedGetWalletNetwork = networkService.getWalletNetwork as jest.Mock;

const ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const POLL_INTERVAL_MS = 10_000;

/** Flushes pending promise microtasks (safe under fake timers). */
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

/**
 * Regression tests for issue #1034 — the network mismatch banner
 * (components/wallet/NetworkWarning.tsx, via hooks/useNetworkCheck.ts)
 * must not re-render in a loop while the wallet is idle.
 *
 * There is no `components/wallet/NetworkMismatch.tsx` in this repo (and
 * `git log` shows it never existed); `NetworkWarning` is the real banner,
 * rendered by `WalletConnect` for the connected address.
 *
 * The banner polls the backend every 10s. Once the network state has
 * resolved, further polls that return the same network / the same failure
 * must cause ZERO additional renders: no state update may fire when the
 * resolved chain identity is unchanged.
 */
describe('NetworkWarning re-render loop (#1034)', () => {
  let updateRenders = 0;

  const onRender: ProfilerOnRenderCallback = (_id, phase) => {
    if (phase === 'update') updateRenders += 1;
  };

  const renderBanner = (address: string | null = ADDRESS) => {
    updateRenders = 0;
    return render(
      <Profiler id="network-warning" onRender={onRender}>
        <NetworkWarning address={address} />
      </Profiler>
    );
  };

  /** Settles the initial check, then advances `cycles` poll intervals. */
  const settleAndPoll = async (cycles: number) => {
    await act(async () => {
      await flushMicrotasks();
    });
    for (let i = 0; i < cycles; i += 1) {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      });
    }
    await act(async () => {
      await flushMicrotasks();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not re-render while idle after a failed check settles (error path)', async () => {
    // Mirrors production: /api/wallet/network does not exist in this repo,
    // so every check fails with the same message.
    mockedGetWalletNetwork.mockResolvedValue({
      success: false,
      message: 'Failed to check wallet network',
    });

    renderBanner();

    await settleAndPoll(0);
    expect(
      screen.getByText('Could not verify network')
    ).toBeInTheDocument();
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(1);

    const rendersAfterSettle = updateRenders;

    await settleAndPoll(3);
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(4);
    expect(updateRenders).toBe(rendersAfterSettle);
  });

  it('does not re-render while idle when the wallet network matches (match path)', async () => {
    // Fresh object identity per call, exactly like response.json() in prod.
    mockedGetWalletNetwork.mockImplementation(async () => ({
      success: true,
      data: { network: 'testnet', chainId: 0 },
    }));

    renderBanner();

    await settleAndPoll(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(1);

    const rendersAfterSettle = updateRenders;

    await settleAndPoll(3);
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(4);
    expect(updateRenders).toBe(rendersAfterSettle);
  });

  it('does not re-render while idle when the wallet network mismatches (mismatch path)', async () => {
    mockedGetWalletNetwork.mockImplementation(async () => ({
      success: true,
      data: { network: 'mainnet', chainId: 1 },
    }));

    renderBanner();

    await settleAndPoll(0);
    expect(screen.getByText('Wrong network detected')).toBeInTheDocument();
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(1);

    const rendersAfterSettle = updateRenders;

    await settleAndPoll(3);
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(4);
    expect(updateRenders).toBe(rendersAfterSettle);
  });

  it('fires no state update when the chain ID strictly equals the resolved target', async () => {
    // Same network + same chainId on every poll: the hook must short-circuit
    // before any setState, so the render count stays flat even though the
    // service returns a brand-new object on every call.
    mockedGetWalletNetwork.mockImplementation(async () => ({
      success: true,
      data: { network: 'testnet', chainId: 0 },
    }));

    renderBanner();

    await settleAndPoll(0);
    const rendersAfterSettle = updateRenders;

    await settleAndPoll(5);
    expect(mockedGetWalletNetwork).toHaveBeenCalledTimes(6);
    expect(updateRenders).toBe(rendersAfterSettle);
  });

  it('still updates when the network genuinely changes', async () => {
    mockedGetWalletNetwork.mockResolvedValueOnce({
      success: true,
      data: { network: 'testnet', chainId: 0 },
    });
    mockedGetWalletNetwork.mockResolvedValue({
      success: true,
      data: { network: 'mainnet', chainId: 1 },
    });

    renderBanner();

    await settleAndPoll(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await settleAndPoll(1);
    expect(screen.getByText('Wrong network detected')).toBeInTheDocument();
  });

  it('still recovers when a failing check later succeeds', async () => {
    mockedGetWalletNetwork.mockResolvedValueOnce({
      success: false,
      message: 'Failed to check wallet network',
    });
    mockedGetWalletNetwork.mockResolvedValue({
      success: true,
      data: { network: 'testnet', chainId: 0 },
    });

    renderBanner();

    await settleAndPoll(0);
    expect(
      screen.getByText('Could not verify network')
    ).toBeInTheDocument();

    await settleAndPoll(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
