import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Expose standard dev server configuration
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
