import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'stub-live-prices-bundle',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source.endsWith('live-prices.json')) {
          console.log('--> Intercepted live-prices.json from:', importer);
          return path.resolve(__dirname, 'src/data/stub-live-prices.json');
        }
        return null;
      }
    }

  ],
  server: {
    port: 3000,
    host: true,
    watch: {
      usePolling: true,
      interval: 1000
    }
  }
});

