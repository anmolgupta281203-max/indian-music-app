import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import https from 'https';
import ytSearch from 'yt-search';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// 1. JioSaavn API Proxy
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/yt-search')) {
    return next();
  }
  
  createProxyMiddleware({
    target: 'https://www.jiosaavn.com',
    changeOrigin: true,
    pathRewrite: {
      '^/api': '/api.php',
    },
    headers: {
      'Origin': 'https://www.jiosaavn.com',
      'Referer': 'https://www.jiosaavn.com/',
    }
  })(req, res, next);
});

// 2. YouTube Search API
app.get('/api/yt-search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'No query specified' });
    }

    const r = await ytSearch(query);
    const videos = r.videos.slice(0, 5);
    
    res.json({ results: videos });
  } catch (e) {
    console.error('YT Search Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// 3. Audio Downloader Proxy
app.get('/audio-proxy', (req, res) => {
  const actualUrl = req.query.url;
  if (!actualUrl) {
    return res.status(400).send('No url specified');
  }

  https.get(actualUrl, (targetRes) => {
    const headers = { ...targetRes.headers, 'Access-Control-Allow-Origin': '*' };
    
    if (targetRes.statusCode >= 300 && targetRes.statusCode < 400 && headers.location) {
      const redirectUrl = new URL(headers.location, actualUrl).toString();
      headers.location = `/audio-proxy?url=${encodeURIComponent(redirectUrl)}`;
    }
    
    res.writeHead(targetRes.statusCode, headers);
    targetRes.pipe(res);
  }).on('error', (e) => {
    res.status(500).send(e.message);
  });
});

// 4. Serve React Frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
