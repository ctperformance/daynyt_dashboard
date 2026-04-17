/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ease: {
          bg: '#0C0C0C',
          card: '#151515',
          border: '#1E1E1E',
          cream: '#FFFFFF',
          accent: '#FFFFFF',
          muted: '#666666',
          soft: '#444444',
          green: '#10B981',
          red: '#EF4444',
          orange: '#F97316',
        },
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
