import { act, renderHook } from '@testing-library/react';
import {
  GLOBAL_SEARCH_DEBOUNCE_MS,
  useGlobalSearch,
} from '@/hooks/useGlobalSearch';
import { globalSearchService, type SearchResult } from '@/services/globalSearchService';

jest.mock('@/services/globalSearchService', () => {
  const actual = jest.requireActual('@/services/globalSearchService');
  return {
    ...actual,
    globalSearchService: { search: jest.fn() },
  };
});

const mockSearch = globalSearchService.search as jest.Mock;

const result = (
  overrides: Partial<SearchResult> & Pick<SearchResult, 'id' | 'category'>,
): SearchResult => ({
  title: overrides.id,
  href: `/${overrides.category}/${overrides.id}`,
  ...overrides,
});

const MIXED_RESULTS: SearchResult[] = [
  result({ id: 't1', category: 'transactions', title: '0xabc' }),
  result({ id: 'd1', category: 'deliveries', title: 'TRK001' }),
  result({ id: 'v1', category: 'drivers', title: 'Ada Obi' }),
  result({ id: 'd2', category: 'deliveries', title: 'TRK002' }),
];

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function settleSearch() {
  await act(async () => {
    await delay(GLOBAL_SEARCH_DEBOUNCE_MS + 20);
  });
}

describe('useGlobalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue([]);
  });

  it('starts idle without hitting the search service', () => {
    const { result: hook } = renderHook(() => useGlobalSearch());

    expect(hook.current.query).toBe('');
    expect(hook.current.groups).toEqual([]);
    expect(hook.current.totalResults).toBe(0);
    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.isDebouncing).toBe(false);
    expect(hook.current.isEmpty).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not call the API until the debounce window elapses', async () => {
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('lagos'));
    expect(hook.current.isDebouncing).toBe(true);
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      await delay(GLOBAL_SEARCH_DEBOUNCE_MS - 50);
    });
    expect(mockSearch).not.toHaveBeenCalled();

    await settleSearch();
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('lagos', expect.any(AbortSignal));
  });

  it('collapses rapid query updates into a single API call with the final value', async () => {
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('l'));
    await act(async () => {
      await delay(80);
    });
    act(() => hook.current.setQuery('la'));
    await act(async () => {
      await delay(80);
    });
    act(() => hook.current.setQuery('lagos'));

    expect(mockSearch).not.toHaveBeenCalled();

    await settleSearch();
    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith('lagos', expect.any(AbortSignal));
  });

  it('does not search for a whitespace-only query', async () => {
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('   '));
    await settleSearch();

    expect(mockSearch).not.toHaveBeenCalled();
    expect(hook.current.isEmpty).toBe(false);
    expect(hook.current.isDebouncing).toBe(false);
  });

  it('groups results into Deliveries, Drivers and Transactions in canonical order', async () => {
    mockSearch.mockResolvedValue(MIXED_RESULTS);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();

    expect(hook.current.groups).toHaveLength(3);
    expect(hook.current.groups.map((group) => group.category)).toEqual([
      'deliveries',
      'drivers',
      'transactions',
    ]);
    expect(hook.current.groups.map((group) => group.label)).toEqual([
      'Deliveries',
      'Drivers',
      'Transactions',
    ]);
    expect(hook.current.groups[0].results.map((entry) => entry.id)).toEqual(['d1', 'd2']);
    expect(hook.current.totalResults).toBe(4);
  });

  it('omits categories with no results', async () => {
    mockSearch.mockResolvedValue([result({ id: 'v1', category: 'drivers', title: 'Ada Obi' })]);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('ada'));
    await settleSearch();

    expect(hook.current.groups).toHaveLength(1);
    expect(hook.current.groups[0].category).toBe('drivers');
  });

  it('exposes a loading state while the search is in flight', async () => {
    let resolveSearch: (value: SearchResult[]) => void = () => {};
    mockSearch.mockReturnValue(
      new Promise<SearchResult[]>((resolve) => {
        resolveSearch = resolve;
      }),
    );
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('trk'));
    await settleSearch();
    expect(hook.current.isLoading).toBe(true);

    await act(async () => {
      resolveSearch([]);
    });

    expect(hook.current.isLoading).toBe(false);
  });

  it('reports an empty state only after a search has actually run', async () => {
    mockSearch.mockResolvedValue([]);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('nothing-matches'));
    await settleSearch();

    expect(hook.current.isEmpty).toBe(true);
    expect(hook.current.groups).toEqual([]);
    expect(hook.current.error).toBeNull();
  });

  it('surfaces a service failure and drops stale results', async () => {
    mockSearch.mockResolvedValueOnce(MIXED_RESULTS);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();
    expect(hook.current.totalResults).toBe(4);

    mockSearch.mockRejectedValueOnce(new Error('Search service unavailable'));
    act(() => hook.current.setQuery('ab'));
    await settleSearch();

    expect(hook.current.error).toBe('Search service unavailable');
    expect(hook.current.groups).toEqual([]);
    expect(hook.current.isEmpty).toBe(false);
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    mockSearch.mockRejectedValue('boom');
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();

    expect(hook.current.error).toBe('Unable to complete the search');
  });

  it('clears the error once a later query succeeds', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Search service unavailable'));
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();
    expect(hook.current.error).toBe('Search service unavailable');

    mockSearch.mockResolvedValueOnce([
      result({ id: 'd1', category: 'deliveries', title: 'TRK001' }),
    ]);
    act(() => hook.current.setQuery('trk'));
    await settleSearch();

    expect(hook.current.totalResults).toBe(1);
    expect(hook.current.error).toBeNull();
  });

  it('aborts the previous request when a newer debounced query is ready', async () => {
    mockSearch.mockResolvedValue([]);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();
    expect(mockSearch).toHaveBeenCalledTimes(1);

    const firstSignal = mockSearch.mock.calls[0][1] as AbortSignal;
    act(() => hook.current.setQuery('ab'));
    await settleSearch();

    expect(firstSignal.aborted).toBe(true);
    expect(mockSearch).toHaveBeenLastCalledWith('ab', expect.any(AbortSignal));
  });

  it('ignores a stale response that resolves after a newer query', async () => {
    let resolveFirst: (value: SearchResult[]) => void = () => {};
    mockSearch.mockReturnValueOnce(
      new Promise<SearchResult[]>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    mockSearch.mockResolvedValueOnce([
      result({ id: 'd2', category: 'deliveries', title: 'TRK002' }),
    ]);

    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();
    act(() => hook.current.setQuery('ab'));
    await settleSearch();

    expect(hook.current.totalResults).toBe(1);

    await act(async () => {
      resolveFirst([result({ id: 'd1', category: 'deliveries', title: 'STALE' })]);
    });

    expect(hook.current.results.map((entry) => entry.id)).toEqual(['d2']);
  });

  it('resets everything when the query is emptied', async () => {
    mockSearch.mockResolvedValue(MIXED_RESULTS);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('a'));
    await settleSearch();
    expect(hook.current.totalResults).toBe(4);

    act(() => hook.current.setQuery(''));
    await settleSearch();

    expect(hook.current.totalResults).toBe(0);
    expect(hook.current.groups).toEqual([]);
    expect(hook.current.isEmpty).toBe(false);
  });

  it('clears the query and results on demand, cancelling a pending debounce', async () => {
    mockSearch.mockResolvedValue(MIXED_RESULTS);
    const { result: hook } = renderHook(() => useGlobalSearch());

    act(() => hook.current.setQuery('lagos'));
    act(() => hook.current.clear());
    await settleSearch();

    expect(hook.current.query).toBe('');
    expect(hook.current.groups).toEqual([]);
    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.error).toBeNull();
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
