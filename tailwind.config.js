/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        blush: { 50: '#FFF5F6', 100: '#FFE8EB', 200: '#FFD1D8', 300: '#FFAEBB', 400: '#FF8FA0', 500: '#F96D82', 600: '#E75468', 700: '#C93F52' },
        ink: '#241419',
        cream: '#FFF9F7',
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
