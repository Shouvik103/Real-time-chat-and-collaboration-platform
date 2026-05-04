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
      '/api/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/users': { target: 'http://localhost:3001', changeOrigin: true },
      '/api/messages': { target: 'http://localhost:3002', changeOrigin: true },
      '/api/files': { target: 'http://localhost:3003', changeOrigin: true },
      '/api/notify': { target: 'http://localhost:3004', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req, _res) => {
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
