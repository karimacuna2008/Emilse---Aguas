/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#d8f3dc',
          200: '#b7e4c7',
          500: '#52b788',
          700: '#2d6a4f',
          900: '#1b4332',
        },
        surface: {
          DEFAULT: '#fffdf7',
          soft:    '#fef9f0',
          border:  '#e7dfc6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

