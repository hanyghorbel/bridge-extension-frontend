import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    // Generate distinct unminified files named identically to match manifest.json paths
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Emit background.js and content.js at the dist root so paths match manifest.json
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          // Keep other app assets hashed under assets/
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});