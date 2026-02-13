import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'webview.js',
        chunkFileNames: 'webview.js',
        assetFileNames: 'webview.css'
      }
    }
  }
});
