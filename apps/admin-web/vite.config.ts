import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import https from 'https';
import http from 'http';

function googleMapsUnshortenerPlugin() {
  return {
    name: 'google-maps-unshortener',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/api/unshorten')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost:3000');
            const targetUrl = urlObj.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing url parameter' }));
              return;
            }

            const client = targetUrl.startsWith('https') ? https : http;
            client.get(
              targetUrl,
              { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } },
              (remoteRes) => {
                const redirectUrl = remoteRes.headers.location || targetUrl;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ redirectUrl, statusCode: remoteRes.statusCode }));
              }
            ).on('error', (err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            });
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        } else {
          next();
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.ELECTRON === 'true' ? './' : '/',
  plugins: [react(), googleMapsUnshortenerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@college-bus/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
  },
});
