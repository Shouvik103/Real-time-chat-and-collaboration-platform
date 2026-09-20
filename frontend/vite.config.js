import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://16-192-218-162.sslip.io',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://16-192-218-162.sslip.io',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (err.code === 'ECONNREFUSED') {
              // Suppress connection refused errors during backend startup
              return;
            }
            console.log('proxy error', err);
          });
        },
      },
    },
  },
});
