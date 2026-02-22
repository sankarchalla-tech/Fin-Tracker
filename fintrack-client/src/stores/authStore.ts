import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, GroupMembership } from '@/types';
import { authApi, groupsApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  groups: GroupMembership[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  switchGroup: (groupId: string | null) => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      groups: [],
      isLoading: true,
      isAuthenticated: false,
      
      login: async (email, password) => {
        const response = await authApi.login({ email, password });
        set({ user: response.data.user, isAuthenticated: true });
        get().fetchGroups();
      },
      
      register: async (name, email, password) => {
        const response = await authApi.register({ name, email, password });
        set({ user: response.data.user, isAuthenticated: true });
      },
      
      logout: async () => {
        await authApi.logout();
        set({ user: null, isAuthenticated: false, groups: [] });
      },
      
      fetchUser: async () => {
        try {
          const response = await authApi.me();
          set({ user: response.data.user, isAuthenticated: true, isLoading: false });
          get().fetchGroups();
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
      
      fetchGroups: async () => {
        try {
          const response = await groupsApi.getAll();
          set({ groups: response.data });
        } catch {
          set({ groups: [] });
        }
      },
      
      switchGroup: async (groupId) => {
        const response = await authApi.switchGroup(groupId);
        set({ user: response.data.user });
      },
      
      setUser: (user) => {
        set({ user, isAuthenticated: !!user, isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
