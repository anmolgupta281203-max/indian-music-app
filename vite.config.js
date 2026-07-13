import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import ytSearch from 'yt-search';

const audioProxyPlugin = () => ({
  name: 'audio-proxy-plugin',
  configureServer(server) {
    server.middlewares.use('/audio-proxy', (req, res) => {
      // Extract the url parameter
      const urlParam = req.url.split('?url=')[1];
      if (!urlParam) {
        res.statusCode = 400;
        return res.end('No url specified');
      }
      
      const actualUrl = decodeURIComponent(urlParam);
      
      https.get(actualUrl, (targetRes) => {
        const headers = { ...targetRes.headers, 'Access-Control-Allow-Origin': '*' };
        
        // Handle redirects
        if (targetRes.statusCode >= 300 && targetRes.statusCode < 400 && headers.location) {
          const redirectUrl = new URL(headers.location, actualUrl).toString();
          headers.location = `/audio-proxy?url=${encodeURIComponent(redirectUrl)}`;
        }
        
        res.writeHead(targetRes.statusCode, headers);
        targetRes.pipe(res);
      }).on('error', (e) => {
        res.statusCode = 500;
        res.end(e.message);
      });
    });

    server.middlewares.use('/api/yt-search', async (req, res) => {
      try {
        const query = new URL(req.url, 'http://localhost').searchParams.get('q');
        if (!query) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'No query specified' }));
        }

        const r = await ytSearch(query);
        const videos = r.videos.slice(0, 5); // Return top 5
        
        res.setHeader('Content-Type', 'application/json');
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
  plugins: [react(), audioProxyPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api.php')
      }
    }
  }
})
