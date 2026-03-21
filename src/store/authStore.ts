import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types';

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  updateWallet: (address: string) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setAuth: (user, token) => set({ user, token, error: null }),
      logout: () => set({ user: null, token: null, error: null }),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
      updateWallet: (address) =>
        set((state) => ({
          user: state.user ? { ...state.user, walletAddress: address } : null,
        })),
    }),
    {
      name: 'chain-quest-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
