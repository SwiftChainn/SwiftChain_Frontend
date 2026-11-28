/**
 * Statistics component tests
 *
 * Architecture under test:
 *   Statistics (Component) → useAdminDashboard (Hook) → adminService (Service)
 *
 * The hook boundary is mocked (as with the other component tests in this repo)
 * so the presentation contract can be asserted without a QueryClient. The
 * assertions focus on the skeleton/loaded box parity that prevents CLS: the
 * loading skeleton and the loaded value share the same card and value-slot
 * dimensions, so the grid cannot reflow when API data arrives.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Statistics } from '@/components/dashboard/Statistics';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useCurrency } from '@/context/CurrencyContext';
import type { AdminStats } from '@/services/adminService';

jest.mock('@/hooks/useAdminDashboard');
jest.mock('@/context/CurrencyContext', () => ({
  useCurrency: jest.fn(),
}));

const mockUseAdminDashboard = useAdminDashboard as jest.MockedFunction<
  typeof useAdminDashboard
>;
const mockUseCurrency = useCurrency as jest.MockedFunction<typeof useCurrency>;

/** Backend stats payload shape returned by adminService.getStats(). */
const BACKEND_STATS: AdminStats = {
  totalUsers: 1284,
  activeDeliveries: 57,
  totalRevenue: 48250.5,
  activeDrivers: 96,
  pendingKyc: 12,
  escrowLocked: 13400,
};

const refetch = jest.fn();

const mockDashboard = (overrides: Partial<ReturnType<typeof useAdminDashboard>> = {}) => {
  mockUseAdminDashboard.mockReturnValue({
    stats: undefined,
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  });
};

const mockCurrency = () => {
  mockUseCurrency.mockReturnValue({
    currency: 'USD',
    currencies: ['USD'],
    setCurrency: jest.fn(),
    formatCurrency: (xlmAmount: number) =>
      `$${xlmAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    isLoading: false,
    isError: false,
    updatedAt: null,
  } as ReturnType<typeof useCurrency>);
};

const renderLoading = () => {
  mockDashboard({ isLoading: true, stats: undefined });
  return render(<Statistics />);
};

const renderLoaded = () => {
  mockDashboard({ isLoading: false, stats: BACKEND_STATS });
  return render(<Statistics />);
};

/** Card outer boxes, in render order. */
const getCardBoxes = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.grid > div'));

/** Value slots — the fixed box shared by the skeleton and the loaded number. */
const getValueSlots = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.grid > div > div:last-child'));

const getGrid = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('.grid') as HTMLElement;

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrency();
});

describe('Statistics', () => {
  it('renders six skeleton loaders while the backend data is loading', () => {
    const { container } = renderLoading();

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(6);

    // Every skeleton reserves a fixed 2rem × 6rem footprint.
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveClass('h-8', 'w-24');
    });

    // No backend values are rendered before the response arrives.
    expect(screen.queryByText('1,284')).not.toBeInTheDocument();
    expect(screen.queryByText('$48,250.50')).not.toBeInTheDocument();
  });

  it('renders the backend statistics once loaded', () => {
    const { container } = renderLoaded();

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
    expect(screen.getByText('1,284')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('57')).toBeInTheDocument(); // activeDeliveries
    expect(screen.getByText('$48,250.50')).toBeInTheDocument(); // totalRevenue
    expect(screen.getByText('96')).toBeInTheDocument(); // activeDrivers
    expect(screen.getByText('12')).toBeInTheDocument(); // pendingKyc
    expect(screen.getByText('$13,400.00')).toBeInTheDocument(); // escrowLocked
  });

  it('keeps the card box dimensions identical between skeleton and loaded states', () => {
    const loading = renderLoading();
    const loadingCards = getCardBoxes(loading.container);
    const loadingSlots = getValueSlots(loading.container);
    loading.unmount();

    const loaded = renderLoaded();
    const loadedCards = getCardBoxes(loaded.container);
    const loadedSlots = getValueSlots(loaded.container);

    expect(loadingCards).toHaveLength(6);
    expect(loadedCards).toHaveLength(6);

    // Card wrappers (fixed min height) are byte-for-byte identical in class.
    const loadingCardClasses = loadingCards.map((card) => card.className);
    const loadedCardClasses = loadedCards.map((card) => card.className);
    expect(loadingCardClasses).toEqual(loadedCardClasses);
    loadingCardClasses.forEach((className) => {
      expect(className).toContain('min-h-[8.5rem]');
    });

    // Value slots (which hold skeleton or number) are also identical, so the
    // 2rem-high skeleton swaps into an identically sized box.
    const loadingSlotClasses = loadingSlots.map((slot) => slot.className);
    const loadedSlotClasses = loadedSlots.map((slot) => slot.className);
    expect(loadingSlotClasses).toEqual(loadedSlotClasses);
    loadingSlotClasses.forEach((className) => {
      expect(className).toContain('min-h-8');
      expect(className).toContain('min-w-24');
    });
  });

  it('keeps the responsive breakpoint classes identical between states', () => {
    const loading = renderLoading();
    const loadingGridClass = getGrid(loading.container).className;
    loading.unmount();

    const loaded = renderLoaded();
    const loadedGridClass = getGrid(loaded.container).className;

    // Same grid at every breakpoint: 1 col mobile → 2 at sm → 3 at lg.
    expect(loadingGridClass).toEqual(loadedGridClass);
    expect(loadingGridClass).toContain('grid');
    expect(loadingGridClass).toContain('sm:grid-cols-2');
    expect(loadingGridClass).toContain('lg:grid-cols-3');
  });
});
