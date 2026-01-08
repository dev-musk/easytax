import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // ✅ Build config
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'esbuild',
    // Increase chunk size for libraries like Quagga
    rollupOptions: {
      output: {
        manualChunks: {
          'quagga': ['@ericblade/quagga2'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  },

  // ✅ Development server config
  server: {
    port: 5173,
    strictPort: false,
    host: 'localhost',
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        // Allow WebSocket if needed
        ws: true
      }
    },
    // Allow camera/microphone access in dev
    https: false,
  },

  // ✅ CRITICAL: Configure public directory
  // This tells Vite to serve files from public/ folder
  // This is required for quagga.min.js to be accessible at /quagga.min.js
  publicDir: 'public',

  // ✅ Optimize dependenciess
  optimizeDeps: {
    exclude: ['@ericblade/quagga2']
  },

  // ✅ Assets handling
  assetsInclude: ['**/*.wasm', '**/*.worker.js'],
})