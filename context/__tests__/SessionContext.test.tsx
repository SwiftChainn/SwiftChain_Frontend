import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SessionProvider, useSession } from '@/context/SessionContext';
import { useAuthStore } from '@/store/authStore';
import { authApiService } from '@/services/auth.service';

jest.mock('@/services/auth.service', () => ({
  authApiService: { getCurrentUser: jest.fn() },
}));

const mockGetCurrentUser = jest.mocked(authApiService.getCurrentUser);

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

describe('SessionProvider / useSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    act(() => useAuthStore.getState().clearUser());
  });

  it('throws when used outside a provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSession())).toThrow(/SessionProvider/);
    spy.mockRestore();
  });

  it('resolves to unauthenticated without calling the API when there is no token', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('reports loading while the token is being verified, then authenticated', async () => {
    window.localStorage.setItem('authToken', 'token');
    let resolve!: (value: Awaited<ReturnType<typeof authApiService.getCurrentUser>>) => void;
    mockGetCurrentUser.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe('loading');

    await act(async () => {
      resolve({
        success: true,
        data: { id: 'u1', email: 'driver@example.com', role: 'driver' },
      } as never);
    });

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user).toEqual({ id: 'u1', email: 'driver@example.com', role: 'Driver' });
    expect(result.current.role).toBe('Driver');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('falls back to the Customer role for unknown API roles', async () => {
    window.localStorage.setItem('authToken', 'token');
    mockGetCurrentUser.mockResolvedValue({
      success: true,
      data: { id: 'u2', email: 'x@example.com', role: 'mystery' },
    } as never);

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.role).toBe('Customer'));
  });

  it('discards the token and clears the session when verification fails', async () => {
    window.localStorage.setItem('authToken', 'stale');
    mockGetCurrentUser.mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBe('unauthenticated');
    expect(window.localStorage.getItem('authToken')).toBeNull();
  });

  it('clears the session when the API returns no user', async () => {
    window.localStorage.setItem('authToken', 'token');
    mockGetCurrentUser.mockResolvedValue({ success: true, data: null } as never);

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('hasRole checks the current role against one or many roles', async () => {
    act(() =>
      useAuthStore.getState().setUser({ id: 'a', email: 'a@example.com', role: 'Admin' }),
    );
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasRole('Admin')).toBe(true);
    expect(result.current.hasRole(['Driver', 'Admin'])).toBe(true);
    expect(result.current.hasRole('Driver')).toBe(false);
  });

  it('reflects a login that happens after the initial check', async () => {
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() =>
      useAuthStore.getState().setUser({ id: 'c', email: 'c@example.com', role: 'Customer' }),
    );

    expect(result.current.status).toBe('authenticated');
    expect(result.current.role).toBe('Customer');
  });

  it('signOut removes the token and clears the user', async () => {
    window.localStorage.setItem('authToken', 'token');
    mockGetCurrentUser.mockResolvedValue({
      success: true,
      data: { id: 'u1', email: 'a@example.com', role: 'admin' },
    } as never);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.signOut());

    expect(window.localStorage.getItem('authToken')).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
  });

  it('shares one verification across all consumers', async () => {
    window.localStorage.setItem('authToken', 'token');
    mockGetCurrentUser.mockResolvedValue({
      success: true,
      data: { id: 'u1', email: 'a@example.com', role: 'driver' },
    } as never);

    function Consumer({ id }: { id: string }) {
      const { role } = useSession();
      return <span data-testid={id}>{role ?? 'none'}</span>;
    }

    render(
      <SessionProvider>
        <Consumer id="one" />
        <Consumer id="two" />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('one')).toHaveTextContent('Driver'));
    expect(screen.getByTestId('two')).toHaveTextContent('Driver');
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
  });
});
