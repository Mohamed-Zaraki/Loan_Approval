import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the frontend can call the Python backend through this
// proxy by setting VITE_API_URL=/api in a .env file.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
