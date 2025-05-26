import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bible-gold': '#D4AF37',
        teal: {
          50: '#E6FFFA',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2A44',
          900: '#111827',
        },
        blue: {
          900: '#1E3A8A', // Dark blue for error toasts
        },
      },
      fontFamily: {
        comfortaa: ['Comfortaa', 'sans-serif'],
      },
    },
  },
  safelist: [
    'bg-[#6A7282]',
    'dark:bg-[#9CA3AF]',
  ],
  plugins: [],
};

export default config;