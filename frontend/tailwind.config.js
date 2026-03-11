/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#1a1d21',
          hover: '#27272a',
          active: '#3b3b45',
        },
        chat: {
          DEFAULT: '#141414',
          surface: '#1e1e24',
          border: '#2e2e38',
        },
        brand: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
        },
      },
    },
  },
  plugins: [],
};
