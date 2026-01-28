/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'jost': ['Jost', 'sans-serif'],
        'garamond': ['Cormorant Garamond', 'serif'],
      },
      colors: {
        'lodha-gold': '#9D7F1B',
        'lodha-black': '#000000',
        'lodha-grey': '#6D6E71',
        'lodha-sand': '#F3F1E7',
        // Legacy colors for backward compatibility
        'lodha-deep': '#9E7E1D',
        'lodha-bronze': '#5C4B13',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
}