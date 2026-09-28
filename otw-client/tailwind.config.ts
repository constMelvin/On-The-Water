import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'sans-serif'],
        display: ['var(--font-fredoka)', 'sans-serif'],
      },
      colors: {
        rosy: {
          DEFAULT: 'var(--rosy)',
          dark: 'var(--rosy-dark)',
        },
        zest: {
          DEFAULT: 'var(--zest)',
          dark: 'var(--zest-dark)',
        },
        blossom: 'var(--blossom)',
        teal: {
          DEFAULT: 'var(--teal)',
          dark: 'var(--teal-dark)',
        },
        cream: 'var(--cream)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        pill: '999px',
        'blob-1': '58% 42% 45% 55% / 55% 48% 52% 45%',
        'blob-2': '46% 54% 38% 62% / 50% 42% 58% 50%',
        'blob-step': '40px 40px 44px 44px / 48px 48px 40px 40px',
        'blob-icon': '50% 50% 40% 60% / 60% 40% 60% 40%',
        'card-rounded': '24px',
      },
      boxShadow: {
        'squish-rosy': '0 7px 0 var(--rosy-dark)',
        'squish-rosy-active': '0 2px 0 var(--rosy-dark)',
        'squish-zest': '0 7px 0 var(--zest-dark)',
        'squish-zest-active': '0 2px 0 var(--zest-dark)',
        'squish-teal': '0 5px 0 var(--teal-dark)',
        'squish-teal-active': '0 1px 0 var(--teal-dark)',
        'card-soft': '0 10px 0 rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;