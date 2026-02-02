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
        // Primary Colors
        'lodha-gold': '#9D7F1B',
        'lodha-grey': '#6D6E71',
        'lodha-cream': '#F0EADC',
        'lodha-sand': '#F3F1E7',
        // Secondary Colors
        'lodha-muted-gold': '#CAC6A3',
        'lodha-sage': '#E8E6D4',
        'lodha-cool-grey': '#949CA1',
        'lodha-steel': '#CED8DD',
        // Legacy compatibility (mapped to new colors)
        'lodha-deep': '#9D7F1B',
        'lodha-bronze': '#6D6E71',
        'lodha-black': '#6D6E71', // Mapped to grey, not pure black
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
}