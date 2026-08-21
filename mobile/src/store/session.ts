import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '@/utils/storage';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface SessionState {
  token: string | null;
  user: UserProfile | null;
  setSession: (data: { token: string; user: UserProfile }) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (data) =>
        set({
          token: data.token,
          user: data.user,
        }),
      clearSession: () =>
        set({
          token: null,
          user: null,
        }),
    }),
    {
      name: 'crumbs-session-storage',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
