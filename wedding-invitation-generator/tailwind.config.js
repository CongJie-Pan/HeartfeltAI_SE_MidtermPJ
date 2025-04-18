/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wedding: {
          primary: '#FFD1DC', // Light pink
          secondary: '#F8F9FA', // Off-white
          accent: '#FFC0CB', // Pink
          text: '#4A4A4A', // Dark gray
          dark: '#6D6875', // Dark purple-gray
        }
      },
      fontFamily: {
        'sans': ['Noto Sans TC', 'sans-serif'],
        'serif': ['Noto Serif TC', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
} 