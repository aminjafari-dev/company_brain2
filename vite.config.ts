import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from 'vite';
import { jiraDevApiPlugin } from './server/jiraDevPlugin';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), jiraDevApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Optional live Gemini chat when `npm run ai-server` is also running.
        '/api/ai': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});
