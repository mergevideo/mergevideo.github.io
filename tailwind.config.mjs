/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ocean: {
          DEFAULT: '#3368A0',
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3daec',
          300: '#94bfe0',
          400: '#66A3BF',
          500: '#3368A0',
          600: '#285586',
          700: '#20446c',
          800: '#1a3756',
          900: '#172f48',
          950: '#0e1d2e',
        },
        cerulean: {
          DEFAULT: '#66A3BF',
          light: '#88b9d0',
          dark: '#4c8ba7',
        },
        sage: {
          DEFAULT: '#C8DFDB',
          light: '#e1efec',
          dark: '#adcbc6',
        },
        cream: {
          DEFAULT: '#F2EFE7',
          50: '#fbfaf8',
          100: '#F2EFE7',
          200: '#e5e0d3',
          300: '#d7d0bf',
        },
        brand: {
          50: '#f4f7fa',
          100: '#e7eef5',
          200: '#C8DFDB',
          300: '#9ec4d5',
          400: '#66A3BF',
          500: '#3368A0',
          600: '#2a5788',
          700: '#224770',
          800: '#1c3958',
          900: '#152940',
          950: '#0c1622',
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 4s linear infinite',
      }
    },
  },
  plugins: [],
};
