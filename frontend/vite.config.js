import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy envía /api al backend (puerto 4000) para evitar problemas de CORS en desarrollo
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});