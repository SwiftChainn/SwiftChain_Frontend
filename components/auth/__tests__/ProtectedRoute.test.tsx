import { act, render, screen, waitFor } from '@testing-library/react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SessionProvider } from '@/context/SessionContext';
import { useAuthStore, type UserRole } from '@/store/authStore';

const mockReplace = jest.fn();
let mockPathname = '/';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
}));

jest.mock('@/services/auth.service', () => ({
  authApiService: { getCurrentUser: jest.fn() },
}));

function signIn(role: UserRole) {
  act(() => useAuthStore.getState().setUser({ id: 'u', email: 'u@example.com', role }));
}

function renderRoute(props: Partial<React.ComponentProps<typeof ProtectedRoute>> = {}) {
  return render(
    <SessionProvider>
      <ProtectedRoute {...props}>
        <div>secret</div>
      </ProtectedRoute>
    </SessionProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockPathname = '/';
    act(() => useAuthStore.getState().clearUser());
  });

  it('redirects unauthenticated visitors to /login and renders nothing', async () => {
    renderRoute();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders children for any authenticated user when the path has no rule', async () => {
    mockPathname = '/support';
    signIn('Customer');
    renderRoute();

    expect(await screen.findByText('secret')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('applies the path rule: a Customer is sent to their home route from /admin', async () => {
    mockPathname = '/admin/overview';
    signIn('Customer');
    renderRoute();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/deliveries/create'));
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('sends a Driver away from admin routes to the driver home', async () => {
    mockPathname = '/admin';
    signIn('Driver');
    renderRoute();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/driver/jobs'));
  });

  it('sends an Admin away from driver routes to the admin home', async () => {
    mockPathname = '/driver/jobs';
    signIn('Admin');
    renderRoute();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/admin/overview'));
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders children when the role matches the path rule', async () => {
    mockPathname = '/driver/jobs';
    signIn('Driver');
    renderRoute();

    expect(await screen.findByText('secret')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('honours the requiredRole prop over the path rule', async () => {
    mockPathname = '/support';
    signIn('Driver');
    renderRoute({ requiredRole: 'Admin' });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/driver/jobs'));
  });

  it('honours the allowedRoles prop', async () => {
    mockPathname = '/support';
    signIn('Fleet Operator');
    renderRoute({ allowedRoles: ['Admin', 'Fleet Operator'] });

    expect(await screen.findByText('secret')).toBeInTheDocument();
  });

  it('reacts when the role changes after sign-in', async () => {
    mockPathname = '/admin';
    signIn('Admin');
    renderRoute();
    expect(await screen.findByText('secret')).toBeInTheDocument();

    signIn('Customer');

    await waitFor(() => expect(screen.queryByText('secret')).not.toBeInTheDocument());
    expect(mockReplace).toHaveBeenCalledWith('/deliveries/create');
  });
});
