/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#d9ddeb',
          300: '#b7bfd6',
          400: '#8b96b8',
          500: '#67739b',
          600: '#505b82',
          700: '#414a6a',
          800: '#39405a',
          900: '#262b3d',
          950: '#171b29',
        },
        accent: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bccfff',
          300: '#8eabff',
          400: '#597dff',
          500: '#3354f7',
          600: '#2438ec',
          700: '#1f2dd2',
          800: '#2129a9',
          900: '#212a85',
          950: '#181c51',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,27,41,.04), 0 8px 24px -8px rgba(23,27,41,.10)',
        'card-hover': '0 2px 4px rgba(23,27,41,.05), 0 20px 44px -12px rgba(36,56,236,.18)',
        glow: '0 0 0 1px rgba(51,84,247,.12), 0 8px 40px -6px rgba(51,84,247,.28)',
      },
      keyframes: {
        'blob-float': {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(40px,-30px) scale(1.08)' },
          '66%': { transform: 'translate(-30px,24px) scale(.95)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.45', transform: 'scale(.8)' },
        },
      },
      animation: {
        'blob-float': 'blob-float 18s ease-in-out infinite',
        'blob-float-slow': 'blob-float 26s ease-in-out infinite reverse',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
