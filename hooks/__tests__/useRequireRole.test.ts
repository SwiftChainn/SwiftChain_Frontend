import { renderHook, act, waitFor } from '@testing-library/react';
import { useRequireRole } from '@/hooks/useRequireRole';
import { useAuthStore } from '@/store/authStore';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe('useRequireRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useAuthStore.getState().clearUser();
    });
  });

  it('redirects unauthenticated users to /login', async () => {
    renderHook(() => useRequireRole('Fleet Operator'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('redirects authenticated users with a different role to /', async () => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'u1',
        email: 'driver@example.com',
        role: 'Driver',
      });
    });

    const { result } = renderHook(() => useRequireRole('Fleet Operator'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(result.current.isAuthorized).toBe(false);
  });

  it('reports isAuthorized=true for users with the exact required role', () => {
    act(() => {
      useAuthStore.getState().setUser({
        id: 'u2',
        email: 'fleet@example.com',
        role: 'Fleet Operator',
      });
    });

    const { result } = renderHook(() => useRequireRole('Fleet Operator'));
    expect(result.current.isAuthorized).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
