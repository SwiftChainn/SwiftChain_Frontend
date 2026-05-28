import { renderHook, act } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeliveryFilters } from '../hooks/useDeliveryFilters';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('useDeliveryFilters', () => {
  const mockPush = jest.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('should initialize with empty filters', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    expect(result.current.search).toBeUndefined();
    expect(result.current.status).toBeUndefined();
    expect(result.current.sortBy).toBeUndefined();
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('should update search filter', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    act(() => {
      result.current.updateFilters({ search: 'TRK12345' });
    });

    expect(mockPush).toHaveBeenCalledWith('?search=TRK12345', { scroll: false });
  });

  it('should update status filter', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    act(() => {
      result.current.updateFilters({ status: 'DELIVERED' });
    });

    expect(mockPush).toHaveBeenCalledWith('?status=DELIVERED', { scroll: false });
  });

  it('should update sort filter', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    act(() => {
      result.current.updateFilters({ sortBy: 'date-desc' });
    });

    expect(mockPush).toHaveBeenCalledWith('?sortBy=date-desc', { scroll: false });
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    act(() => {
      result.current.updateFilters({ 
        search: 'TRK12345', 
        status: 'IN_TRANSIT',
        sortBy: 'date-asc'
      });
    });

    const call = mockPush.mock.calls[0][0];
    expect(call).toContain('search=TRK12345');
    expect(call).toContain('status=IN_TRANSIT');
    expect(call).toContain('sortBy=date-asc');
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    act(() => {
      result.current.clearFilters();
    });

    expect(mockPush).toHaveBeenCalledWith('', { scroll: false });
  });

  it('should remove a filter when set to empty string', () => {
    const { result } = renderHook(() => useDeliveryFilters());

    act(() => {
      result.current.updateFilters({ search: '' });
    });

    expect(mockPush).toHaveBeenCalledWith('', { scroll: false });
  });
});
