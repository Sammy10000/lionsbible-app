import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bible-gold': '#D4AF37',
      },
      screens: {
        '3xl': '1792px',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#1d4ed8",
          "secondary": "#9333ea",
        },
        dark: {
          "primary": "#3b82f6",
          "secondary": "#a855f7",
        }
      }
    ],
  },
};

export default config;