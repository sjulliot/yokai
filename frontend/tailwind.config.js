/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1F2A',
        paper: '#F5F1E6',
        lacquer: '#C33C3C',
        gold: '#D4A657',
      },
      fontFamily: {
        display: ['"Shippori Mincho"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
