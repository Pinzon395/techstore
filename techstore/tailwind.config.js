/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563EB', dark: '#1D4ED8', light: '#EFF6FF' },
      },
    },
  },
  plugins: [],
}
