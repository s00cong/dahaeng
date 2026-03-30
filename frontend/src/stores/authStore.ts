import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/schemas/auth.schema";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  hasCompletedPreference: boolean;
  isLoggedIn: boolean;
  isGuest: boolean;

  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  setHasCompletedPreference: (v: boolean) => void;
  setGuest: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hasCompletedPreference: false,
      isLoggedIn: false,
      isGuest: false,

      setAccessToken: (token) => set({ accessToken: token, isLoggedIn: true, isGuest: false }),
      setUser: (user) => set({ user }),
      setHasCompletedPreference: (v) => set({ hasCompletedPreference: v }),
      setGuest: () => set({ isGuest: true, hasCompletedPreference: true }),
      logout: () =>
        set({
          accessToken: null,
          user: null,
          hasCompletedPreference: false,
          isLoggedIn: false,
          isGuest: false,
        }),
    }),
    {
      name: "dahaeng-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        hasCompletedPreference: state.hasCompletedPreference,
        isLoggedIn: state.isLoggedIn,
        isGuest: state.isGuest,
      }),
    },
  ),
);
