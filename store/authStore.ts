import { create } from 'zustand';

export type UserRole =
  | 'Customer'
  | 'Driver'
  | 'Admin'
  | 'Fleet Operator';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setUser: (user: AuthUser) => set({ user, isAuthenticated: true }),
  clearUser: () => set(initialState),
}));
