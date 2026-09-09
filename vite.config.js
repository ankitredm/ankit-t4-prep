import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { copyFileSync, existsSync } from 'node:fs';

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    {
      name: 'spa-github-pages-404',
      closeBundle() {
        if (existsSync('dist/index.html')) copyFileSync('dist/index.html', 'dist/404.html');
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/v1-openai': { target: 'https://api.openai.com', changeOrigin: true, rewrite: (p) => p.replace(/^\/v1-openai/, '/v1') },
    },
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
});
