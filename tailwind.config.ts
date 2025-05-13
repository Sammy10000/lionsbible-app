﻿import type { Config } from 'tailwindcss';

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
