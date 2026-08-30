import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { GLOBAL_SEARCH_DEBOUNCE_MS } from '@/hooks/useGlobalSearch';
import api from '@/lib/api';

/**
 * E2E: Global Unified Search and Debounce Logic
 *
 * Exercises the full search stack (component → hook → service) with the
 * HTTP client, wallet, and WebSocket layers mocked so the suite stays
 * deterministic.
 */

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    connect: jest.fn().mockResolvedValue(true),
    address: 'GABCD...MOCK_WALLET_ADDRESS',
    isConnected: true,
    signTransaction: jest.fn().mockResolvedValue('mock_signed_xdr'),
  }),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

const mockGet = api.get as jest.Mock;

const MIXED_RESULTS = [
  { id: 't1', category: 'transactions', title: '0xabc123', subtitle: '250 XLM' },
  { id: 'd1', category: 'deliveries', title: 'TRK001', subtitle: 'In transit' },
  { id: 'v1', category: 'drivers', title: 'Ada Obi', subtitle: 'Lagos' },
  { id: 'd2', category: 'deliveries', title: 'TRK002', subtitle: 'Pending' },
];

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function typeIntoSearch(value: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Global search' }), {
    target: { value },
  });
}

describe('E2E: Global Unified Search and Debounce Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: { results: [] } });
  });

  it('renders the global search bar without querying the API on idle', () => {
    render(<GlobalSearch />);

    expect(screen.getByRole('searchbox', { name: 'Global search' })).toBeInTheDocument();
    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
  });

  it('does not fire the API while the user is still typing', () => {
    render(<GlobalSearch />);

    typeIntoSearch('lagos');

    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('fires a single API call with the final query after the debounce window', async () => {
    mockGet.mockResolvedValue({ data: { results: MIXED_RESULTS } });
    render(<GlobalSearch />);

    typeIntoSearch('lagos');
    expect(mockGet).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      },
      { timeout: GLOBAL_SEARCH_DEBOUNCE_MS + 500 },
    );
    expect(mockGet).toHaveBeenCalledWith('/search', {
      params: { q: 'lagos' },
      signal: expect.any(AbortSignal),
    });
  });

  it('resets the debounce timer on each keystroke so intermediate queries never hit the API', async () => {
    mockGet.mockResolvedValue({ data: { results: MIXED_RESULTS } });
    render(<GlobalSearch />);

    typeIntoSearch('l');
    await act(async () => {
      await delay(80);
    });
    typeIntoSearch('la');
    await act(async () => {
      await delay(80);
    });
    typeIntoSearch('lag');

    expect(mockGet).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(mockGet).toHaveBeenCalledTimes(1);
      },
      { timeout: GLOBAL_SEARCH_DEBOUNCE_MS + 500 },
    );
    expect(mockGet).toHaveBeenCalledWith('/search', {
      params: { q: 'lag' },
      signal: expect.any(AbortSignal),
    });
  });

  it('shows grouped results after a successful debounced search', async () => {
    mockGet.mockResolvedValue({ data: { results: MIXED_RESULTS } });
    render(<GlobalSearch />);

    typeIntoSearch('a');

    expect(await screen.findByRole('heading', { name: 'Deliveries' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Deliveries',
      'Drivers',
      'Transactions',
    ]);

    const deliveries = screen.getByRole('region', { name: 'Deliveries' });
    expect(within(deliveries).getByText('TRK001')).toBeInTheDocument();
    expect(within(deliveries).getByText('TRK002')).toBeInTheDocument();
    expect(screen.getByText('Ada Obi')).toBeInTheDocument();
    expect(screen.getByText('0xabc123')).toBeInTheDocument();
  });

  it('shows the empty state when the API returns no matches', async () => {
    mockGet.mockResolvedValue({ data: { results: [] } });
    render(<GlobalSearch />);

    typeIntoSearch('zzz');

    expect(await screen.findByText('No results found for "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows an error when the search API fails after debounce', async () => {
    mockGet.mockRejectedValue(new Error('Search service unavailable'));
    render(<GlobalSearch />);

    typeIntoSearch('trk');

    expect(await screen.findByRole('alert')).toHaveTextContent('Search service unavailable');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('does not query the API for whitespace-only input', async () => {
    render(<GlobalSearch />);

    typeIntoSearch('   ');
    await act(async () => {
      await delay(GLOBAL_SEARCH_DEBOUNCE_MS + 50);
    });

    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByText(/No results found/)).not.toBeInTheDocument();
  });

  it('reports the selected result to the caller', async () => {
    const onSelect = jest.fn();
    mockGet.mockResolvedValue({ data: { results: MIXED_RESULTS } });
    render(<GlobalSearch onSelect={onSelect} />);

    typeIntoSearch('ada');
    fireEvent.click(await screen.findByRole('button', { name: /Ada Obi/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'v1',
        category: 'drivers',
        title: 'Ada Obi',
        href: '/fleet/drivers/v1',
      }),
    );
  });

  it('clears the query and cancels a pending debounce so the API is never called', async () => {
    render(<GlobalSearch />);
    const input = screen.getByRole('searchbox', { name: 'Global search' });

    typeIntoSearch('lagos');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await act(async () => {
      await delay(GLOBAL_SEARCH_DEBOUNCE_MS + 50);
    });

    expect(input).toHaveValue('');
    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
  });

  it('issues a follow-up request with the latest query after a second debounce', async () => {
    mockGet.mockResolvedValueOnce({ data: { results: MIXED_RESULTS } });
    mockGet.mockResolvedValueOnce({
      data: { results: [MIXED_RESULTS[2]] },
    });
    render(<GlobalSearch />);

    typeIntoSearch('a');
    expect(await screen.findByRole('heading', { name: 'Deliveries' })).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(1);

    typeIntoSearch('ada');
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith('/search', {
      params: { q: 'ada' },
      signal: expect.any(AbortSignal),
    });
    await waitFor(() => expect(screen.queryByText('TRK001')).not.toBeInTheDocument());
    expect(screen.getByText('Ada Obi')).toBeInTheDocument();
  });
});
