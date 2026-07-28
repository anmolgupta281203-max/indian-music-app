import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import https from 'https';
import http from 'http';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// 1. TMDB API Proxy
app.use('/tmdb', createProxyMiddleware({
  target: 'https://api.themoviedb.org/3',
  changeOrigin: true,
  pathRewrite: {
    '^/tmdb': '', 
  }
}));

// 2. JioSaavn API Proxy
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/yt-search') || req.path.startsWith('/yt-download')) {
    return next();
  }
  
  createProxyMiddleware({
    target: 'https://www.jiosaavn.com',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return '/api.php' + (cleanPath.startsWith('?') || cleanPath === '' ? cleanPath : '?' + cleanPath);
    },
    headers: {
      'Origin': 'https://www.jiosaavn.com',
      'Referer': 'https://www.jiosaavn.com/',
    }
  })(req, res, next);
});

// 2a. YouTube Search API
app.get('/api/yt-search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'No query specified' });
    }

    const searchQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('music') 
      ? query 
      : `${query} song`;

    const r = await ytSearch(searchQuery);
    const videos = r.videos.filter(v => v.seconds < 600).slice(0, 20);
    
    res.json({ results: videos });
  } catch (e) {
    console.error('YT Search Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// 2b. YouTube Download API
app.get('/api/yt-download', async (req, res) => {
  try {
    const videoId = req.query.id;
    if (!videoId) return res.status(400).send('No id specified');
    
    const info = await ytdl.getInfo(videoId);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo' });
    
    if (!format) {
      return res.status(404).send('No suitable format found');
    }
    
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(info.videoDetails.title)}.mp4"`);
    res.header('Content-Type', 'video/mp4');
    
    ytdl(videoId, { format }).pipe(res);
  } catch (e) {
    console.error('YT Download Error:', e);
    res.status(500).send(e.message);
  }
});

// 3. Robust Audio Stream Proxy with Range Request & Redirect Support
const fetchStream = (targetUrl, clientReq, clientRes, maxRedirects = 5) => {
  if (maxRedirects <= 0) {
    return clientRes.status(500).send('Too many redirects');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    return clientRes.status(400).send('Invalid target URL');
  }

  const httpLib = parsedUrl.protocol === 'https:' ? https : http;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.jiosaavn.com/'
  };

  if (clientReq.headers.range) {
    headers['Range'] = clientReq.headers.range;
  }

  const request = httpLib.get(targetUrl, { headers }, (targetRes) => {
    // Handle redirects
    if (targetRes.statusCode >= 300 && targetRes.statusCode < 400 && targetRes.headers.location) {
      const redirectUrl = new URL(targetRes.headers.location, targetUrl).toString();
      return fetchStream(redirectUrl, clientReq, clientRes, maxRedirects - 1);
    }

    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': targetRes.headers['content-type'] || 'audio/mp4',
      'Accept-Ranges': 'bytes'
    };

    if (targetRes.headers['content-range']) {
      responseHeaders['Content-Range'] = targetRes.headers['content-range'];
    }
    if (targetRes.headers['content-length']) {
      responseHeaders['Content-Length'] = targetRes.headers['content-length'];
    }

    clientRes.writeHead(targetRes.statusCode || 200, responseHeaders);
    targetRes.pipe(clientRes);
  });

  request.on('error', (err) => {
    console.error('Audio Proxy Stream Error:', err.message);
    if (!clientRes.headersSent) {
      clientRes.status(500).send(err.message);
    }
  });
};

app.options('/audio-proxy', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.sendStatus(204);
});

app.get('/audio-proxy', (req, res) => {
  const actualUrl = req.query.url;
  if (!actualUrl) {
    return res.status(400).send('No url specified');
  }
  fetchStream(actualUrl, req, res);
});

// 4. Serve React Frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router (must be last)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
