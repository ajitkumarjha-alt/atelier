const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    exclude: ['tests/health.test.js', 'tests/positive.test.js', 'tests/validation.test.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**', 'server/**'],
      exclude: ['node_modules', 'tests'],
    },
  },
  server: {
    port: 5174,
    hmr: {
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    exclude: ['pg']
  }
});
