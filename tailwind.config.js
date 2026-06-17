/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          50: '#FFF8F0',
          100: '#FFEED9',
          200: '#FFDDB3',
          300: '#FFC680',
          400: '#FFAA4D',
          500: '#E8713A',
          600: '#CC5A28',
          700: '#A84520',
          800: '#3D2914',
          900: '#2A1C0E',
        },
        surface: {
          50: '#FFF8F0',
          100: '#F5F0EB',
          200: '#E8E0D8',
          300: '#D4C8BC',
        },
        success: '#2D6A4F',
        danger: '#DC2626',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
