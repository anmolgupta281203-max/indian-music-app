import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

app.use(cors());

// 1. TMDB API Proxy
app.get('/api/tmdb/*', async (req, res) => {
  try {
    const tmdbPath = req.url.replace('/api/tmdb', '');
    const tmdbRes = await axios.get(`https://api.themoviedb.org/3${tmdbPath}`, { timeout: 10000 });
    res.json(tmdbRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. YouTube Search Fallback API
app.get('/api/yt-search', async (req, res) => {
  try {
    const query = req.query.q || 'Bollywood Songs';
    const instances = [
      'https://pipedapi.kavin.rocks/search?q=',
      'https://invidious.jing.rocks/api/v1/search?q='
    ];

    for (const baseUrl of instances) {
      try {
        const r = await axios.get(`${baseUrl}${encodeURIComponent(query)}`, { timeout: 4000 });
        let items = r.data.items || r.data;
        if (Array.isArray(items) && items.length > 0) {
          const results = items.slice(0, 20).map(v => ({
            videoId: v.id || v.videoId || (v.url ? v.url.split('v=')[1] : ''),
            title: v.title || query,
            author: { name: v.uploaderName || v.author || 'Trending Artist' },
            thumbnail: v.thumbnail || v.thumbnailUrl || (v.videoThumbnails ? v.videoThumbnails[0]?.url : 'https://via.placeholder.com/320x180'),
            seconds: v.duration || 240
          }));
          return res.json({ results });
        }
      } catch (e) {}
    }

    res.json({ results: [] });
  } catch (e) {
    res.json({ results: [] });
  }
});

// 3. Direct JioSaavn API Proxy (Handles all /api and /api/* calls)
app.all(['/api', '/api/*'], async (req, res) => {
  if (req.path.startsWith('/api/tmdb') || req.path.startsWith('/api/yt-search')) return;

  try {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const targetUrl = `https://www.jiosaavn.com/api.php${queryString}`;

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://www.jiosaavn.com',
        'Referer': 'https://www.jiosaavn.com/'
      },
      timeout: 10000
    });

    res.header('Access-Control-Allow-Origin', '*');
    res.json(response.data);
  } catch (err) {
    console.error("JioSaavn Serverless Proxy Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default app;
