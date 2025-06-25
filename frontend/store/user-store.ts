import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  userSub: string | null;
  email: string | null;
  isAuthenticated: boolean;
  setUser: (userSub: string, email: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userSub: null,
      email: null,
      isAuthenticated: false,
      setUser: (userSub: string, email: string) => set({
        userSub,
        email,
        isAuthenticated: true,
      }),
      clearUser: () => set({
        userSub: null,
        email: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'user-storage', // name of the item in localStorage
    }
  )
);