import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode:
        typeof window !== 'undefined'
          ? localStorage.getItem('color-mode')
            ? localStorage.getItem('color-mode') === 'dark'
            : window.matchMedia('(prefers-color-scheme: dark)').matches
          : false,
      toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    }),
    {
      name: 'color-mode',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
    },
  ),
);