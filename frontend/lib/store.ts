import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  tier: 'ADMIN' | 'STAFF' | 'CLIENT';
  role?: string;
  staffId?: string;
  clientId?: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      setTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set((state) => ({
          accessToken,
          refreshToken,
          isAuthenticated: !!state.user && !!accessToken,
        }));
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('aalawsng-auth');
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'aalawsng-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: !!state.user && !!state.accessToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          const localAccess = localStorage.getItem('accessToken') || state.accessToken;
          const localRefresh = localStorage.getItem('refreshToken') || state.refreshToken;
          if (localAccess) {
            localStorage.setItem('accessToken', localAccess);
            state.accessToken = localAccess;
          }
          if (localRefresh) {
            localStorage.setItem('refreshToken', localRefresh);
            state.refreshToken = localRefresh;
          }
          state.isAuthenticated = !!state.user && !!(localAccess || state.accessToken);
        }
      },
    }
  )
);
