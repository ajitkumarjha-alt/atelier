const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    exclude: ['pg']
  }
});
