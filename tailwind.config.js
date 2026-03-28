/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ease: {
          bg: '#0a0a0a',
          card: '#141414',
          border: '#262626',
          cream: '#fbf8f1',
          accent: '#d4a853',
          green: '#22c55e',
          red: '#ef4444',
          orange: '#f97316',
        },
      },
    },
  },
  plugins: [],
};
