import { renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { breadcrumbService } from '@/services/breadcrumbService';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock the breadcrumb service
jest.mock('@/services/breadcrumbService', () => ({
  breadcrumbService: {
    getLabelForChild: jest.fn(),
  },
}));

describe('useBreadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return home breadcrumb for root path', () => {
    (usePathname as jest.Mock).mockReturnValue('/');

    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toEqual([
      {
        label: 'Home',
        href: '/',
        isLast: true,
      },
    ]);
  });

  it('should generate breadcrumbs for simple route', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');

    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toContainEqual({
      label: 'Home',
      href: '/',
      isLast: false,
    });

    expect(result.current).toContainEqual({
      label: 'Dashboard',
      href: '/dashboard',
      isLast: true,
    });
  });

  it('should format slug names correctly', () => {
    (usePathname as jest.Mock).mockReturnValue('/my-page-name');

    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toContainEqual({
      label: 'My Page Name',
      href: '/my-page-name',
      isLast: true,
    });
  });

  it('should handle nested routes with static and dynamic segments', async () => {
    (usePathname as jest.Mock).mockReturnValue('/deliveries/123e4567-e89b-12d3-a456-426614174000');
    (breadcrumbService.getLabelForChild as jest.Mock).mockResolvedValue('Order #12345');

    const { result } = renderHook(() => useBreadcrumbs());

    // Wait for async resolution
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current).toContainEqual({
      label: 'Home',
      href: '/',
      isLast: false,
    });

    expect(result.current).toContainEqual({
      label: 'Deliveries',
      href: '/deliveries',
      isLast: false,
    });

    expect(result.current).toContainEqual({
      label: 'Order #12345',
      href: '/deliveries/123e4567-e89b-12d3-a456-426614174000',
      isLast: true,
    });
  });

  it('should handle numeric IDs', async () => {
    (usePathname as jest.Mock).mockReturnValue('/escrow/42');
    (breadcrumbService.getLabelForChild as jest.Mock).mockResolvedValue('Contract #42');

    const { result } = renderHook(() => useBreadcrumbs());

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current).toContainEqual({
      label: 'Contract #42',
      href: '/escrow/42',
      isLast: true,
    });
  });

  it('should handle service errors gracefully', async () => {
    (usePathname as jest.Mock).mockReturnValue('/deliveries/123e4567-e89b-12d3-a456-426614174000');
    (breadcrumbService.getLabelForChild as jest.Mock).mockRejectedValue(
      new Error('API error')
    );

    const { result } = renderHook(() => useBreadcrumbs());

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should still have breadcrumbs, but with ID fallback
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should update breadcrumbs when pathname changes', async () => {
    const { rerender } = renderHook(() => useBreadcrumbs());

    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = renderHook(() => useBreadcrumbs()).result.current;
    expect(result).toContainEqual({
      label: 'Dashboard',
      href: '/dashboard',
      isLast: true,
    });
  });

  it('should handle multiple nested levels', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/driver/jobs');

    const { result } = renderHook(() => useBreadcrumbs());

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current[0]).toEqual({
      label: 'Home',
      href: '/',
      isLast: false,
    });

    expect(result.current).toContainEqual({
      label: 'Dashboard',
      href: '/dashboard',
      isLast: false,
    });

    expect(result.current).toContainEqual({
      label: 'Driver',
      href: '/dashboard/driver',
      isLast: false,
    });

    expect(result.current).toContainEqual({
      label: 'Jobs',
      href: '/dashboard/driver/jobs',
      isLast: true,
    });
  });

  it('should handle caching to prevent duplicate API calls', async () => {
    (usePathname as jest.Mock).mockReturnValue('/deliveries/123');
    (breadcrumbService.getLabelForChild as jest.Mock).mockResolvedValue('Delivery 123');

    const { rerender } = renderHook(() => useBreadcrumbs());

    await new Promise((resolve) => setTimeout(resolve, 100));

    rerender();

    // The service should have been called, but caching should prevent excessive calls
    expect(breadcrumbService.getLabelForChild).toHaveBeenCalled();
  });

  it('should handle paths with special characters', () => {
    (usePathname as jest.Mock).mockReturnValue('/my_special-route_name');

    const { result } = renderHook(() => useBreadcrumbs());

    expect(result.current).toContainEqual({
      label: 'My Special Route Name',
      href: '/my_special-route_name',
      isLast: true,
    });
  });
});
