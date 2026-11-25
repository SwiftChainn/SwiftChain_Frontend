import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { authApiService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

jest.mock('@/services/auth.service', () => ({
  authApiService: {
    getCurrentUser: jest.fn(),
  },
}));

const mockGetCurrentUser = authApiService.getCurrentUser as jest.Mock;

const USER = { id: 'u1', email: 'user@example.com', role: 'Customer' as const };

describe('useAuth — disconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    act(() => {
      useAuthStore.getState().clearUser();
    });
    mockGetCurrentUser.mockResolvedValue({
      data: { id: USER.id, email: USER.email, role: 'customer' },
    });
  });

  it('starts unauthenticated when there is no token', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('disconnect removes the token and clears the user', async () => {
    localStorage.setItem('authToken', 'test-token');
    act(() => {
      useAuthStore.getState().setUser(USER);
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => {
      result.current.disconnect();
    });

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
