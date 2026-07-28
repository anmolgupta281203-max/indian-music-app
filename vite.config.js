import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import https from 'https';
import http from 'http';
import ytSearch from 'yt-search';

const fetchProxyStream = (targetUrl, req, res, maxRedirects = 5) => {
  if (maxRedirects <= 0) {
    res.statusCode = 500;
    return res.end('Too many redirects');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    res.statusCode = 400;
    return res.end('Invalid target URL');
  }

  const httpLib = parsedUrl.protocol === 'https:' ? https : http;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.jiosaavn.com/'
  };

  if (req.headers.range) {
    headers['Range'] = req.headers.range;
  }

  const request = httpLib.get(targetUrl, { headers }, (targetRes) => {
    if (targetRes.statusCode >= 300 && targetRes.statusCode < 400 && targetRes.headers.location) {
      const redirectUrl = new URL(targetRes.headers.location, targetUrl).toString();
      return fetchProxyStream(redirectUrl, req, res, maxRedirects - 1);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', targetRes.headers['content-type'] || 'audio/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    if (targetRes.headers['content-range']) {
      res.setHeader('Content-Range', targetRes.headers['content-range']);
    }
    if (targetRes.headers['content-length']) {
      res.setHeader('Content-Length', targetRes.headers['content-length']);
    }

    res.statusCode = targetRes.statusCode || 200;
    targetRes.pipe(res);
  });

  request.on('error', (e) => {
    console.error('Vite audio proxy error:', e.message);
    res.statusCode = 500;
    res.end(e.message);
  });
};

const audioProxyPlugin = () => ({
  name: 'audio-proxy-plugin',
  configureServer(server) {
    server.middlewares.use('/audio-proxy', (req, res) => {
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.statusCode = 204;
        return res.end();
      }

      const urlParam = req.url.split('?url=')[1];
      if (!urlParam) {
        res.statusCode = 400;
        return res.end('No url specified');
      }

      const actualUrl = decodeURIComponent(urlParam);
      fetchProxyStream(actualUrl, req, res);
    });

    server.middlewares.use('/api/yt-search', async (req, res) => {
      try {
        const query = new URL(req.url, 'http://localhost').searchParams.get('q');
        if (!query) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'No query specified' }));
        }

        const searchQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('music') 
          ? query 
          : `${query} song`;

        const r = await ytSearch(searchQuery);
        const videos = r.videos.filter(v => v.seconds < 600).slice(0, 20);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ results: videos }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    audioProxyPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html'
      },
      manifest: {
        name: 'Svar Music',
        short_name: 'Svar',
        description: 'Stream premium Indian music in high fidelity.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        id: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api.php')
      }
    }
  }
});
