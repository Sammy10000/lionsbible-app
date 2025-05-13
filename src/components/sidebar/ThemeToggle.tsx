'use client';

import { FaMoon, FaSun } from 'react-icons/fa';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeToggleProps {
  onClick: () => void;
}

export default function ThemeToggle({ onClick }: ThemeToggleProps) {
  const { isDarkMode, toggleTheme } = useThemeStore();

  const handleClick = () => {
    toggleTheme();
    onClick();
  };

  return (
    <button
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex flex-col items-center text-gray-500 hover:text-teal-500 p-2 rounded-md lg:flex-row lg:justify-center lg:hover:bg-transparent"
      onClick={handleClick}
    >
      {isDarkMode ? <FaSun className="w-10 h-10 lg:w-6 lg:h-6" /> : <FaMoon className="w-10 h-10 lg:w-6 lg:h-6" />}
      <span className="lg:hidden text-sm text-center mt-2">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}