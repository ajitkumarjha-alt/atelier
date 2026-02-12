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
        // Functional colors
        'lodha-deep': '#7A6415',        // Darker gold for hover states
        'lodha-bronze': '#6D6E71',
        'lodha-black': '#2D2926',       // Rich warm black for headings
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 15px -3px rgba(157,127,27,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)',
        'elevated': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'card': '0.75rem',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
}