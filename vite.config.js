import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})