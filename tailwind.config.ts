import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Branding is driven by CSS variables (see app/globals.css)
        // so SOMA can re-skin the portal later without touching components.
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          light: 'rgb(var(--brand-light) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-khmer)', 'Khmer OS Siemreap', 'sans-serif'],
        khmer: ['var(--font-khmer)', 'Khmer OS Siemreap', 'Noto Sans Khmer', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
