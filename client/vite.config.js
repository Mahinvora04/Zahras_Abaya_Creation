import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,

    allowedHosts: [
      'ec2-3-10-139-12.eu-west-2.compute.amazonaws.com'
    ],
  },
});