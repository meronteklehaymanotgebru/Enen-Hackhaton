// utils/userStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  phone: string;
  isPremium: boolean;
  birthDate?: string;
}

interface UserStore {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  // HARDCODED FOR DEMO - Replace with real auth before production
  user: {
    id: 'e4838f25-4d3c-4fa7-9703-68a37b06163d',
    name: 'Meron',
    phone: '+2519XXXXXXXX',
    isPremium: true, // Keep true for full demo access
    birthDate: '2000-01-01'
  },
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));