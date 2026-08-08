import { create } from 'zustand';
import type { UserProfile, UserRole } from '../types';
import * as AuthService from './../services/authService';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const user = await AuthService.getCurrentUser();
      set({ user, loading: false });
    } catch (e) {
      set({
        user: null,
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to restore session',
      });
    }
  },
  login: async (email, password) => {
    set({ error: null, loading: true });
    try {
      const user = await AuthService.loginWithPassword(email, password);
      set({ user, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Login failed',
      });
      throw e;
    }
  },
  loginAsRole: async (role) => {
    const user = await AuthService.loginAsRole(role);
    set({ user, error: null });
  },
  logout: async () => {
    await AuthService.logout();
    set({ user: null });
  },
  switchRole: async (role) => {
    const user = await AuthService.switchRole(role);
    set({ user });
  },
}));
