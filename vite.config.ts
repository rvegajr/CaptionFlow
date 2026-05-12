import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const webRoot = resolve(__dirname, 'src/web');

export default defineConfig({
  plugins: [react()],
  root: webRoot,
  publicDir: resolve(__dirname, 'public'),
  build: {
    target: 'es2022',
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(webRoot, 'index.html'),
        caption_surface: resolve(webRoot, 'caption-surface.html'),
        lti_picker: resolve(webRoot, 'lti-picker.html'),
        spike: resolve(webRoot, 'spike/index.html'),
        test_play: resolve(webRoot, 'test-play/index.html'),
        legal_privacy: resolve(webRoot, 'legal/privacy.html'),
        legal_terms: resolve(webRoot, 'legal/terms.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/lti': 'http://localhost:3000',
      '/.well-known': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
