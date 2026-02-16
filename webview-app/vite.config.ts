import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // 主 Panel
        webview: resolve(__dirname, 'index.html'),
        // 侧边栏
        sidebar: resolve(__dirname, 'src/sidebar/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].css'
      }
    }
  }
});
