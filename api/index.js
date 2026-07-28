import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import https from 'https';
import http from 'http';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';
import axios from 'axios';

const app = express();

app.use(cors());

// 1. TMDB API Proxy
app.use('/api/tmdb', createProxyMiddleware({
  target: 'https://api.themoviedb.org/3',
  changeOrigin: true,
  pathRewrite: {
    '^/api/tmdb': '', 
  }
}));

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

    let videos = [];
    try {
      const r = await ytSearch(searchQuery);
      videos = r.videos.filter(v => v.seconds < 600).slice(0, 20);
    } catch (ytErr) {
      console.error('yt-search failed, falling back to Invidious:', ytErr.message);
    }

    if (videos.length === 0) {
      const instances = [
        'https://iv.melmac.space',
        'https://invidious.jing.rocks',
        'https://vid.puffyan.us'
      ];
      
      for (const url of instances) {
        try {
          const invRes = await axios.get(`${url}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`, { timeout: 4000 });
          if (invRes.data && Array.isArray(invRes.data) && invRes.data.length > 0) {
            videos = invRes.data.slice(0, 20).map(v => {
              const m = Math.floor((v.lengthSeconds || 0) / 60);
              const s = (v.lengthSeconds || 0) % 60;
              let bestThumb = 'https://via.placeholder.com/320x180';
              if (v.videoThumbnails && v.videoThumbnails.length > 0) {
                const targetThumb = v.videoThumbnails.find(t => t.quality === 'medium' || t.quality === 'high' || t.quality === 'maxresdefault');
                bestThumb = targetThumb ? targetThumb.url : v.videoThumbnails[0].url;
              }
              
              return {
                videoId: v.videoId,
                title: v.title,
                author: { name: v.author },
                thumbnail: bestThumb,
                timestamp: `${m}:${s < 10 ? '0' : ''}${s}`
              };
            });
            break;
          }
        } catch (e) {
          console.error(`Invidious fallback ${url} failed:`, e.message);
        }
      }
    }
    
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

// 2c. Direct JioSaavn API Proxy (Optimized for Vercel Serverless)
app.get('/api', async (req, res) => {
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

// 3. Audio Downloader Proxy with Range & Redirect Support for Vercel Serverless
const fetchVercelStream = (targetUrl, clientReq, clientRes, maxRedirects = 5) => {
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
    if (targetRes.statusCode >= 300 && targetRes.statusCode < 400 && targetRes.headers.location) {
      const redirectUrl = new URL(targetRes.headers.location, targetUrl).toString();
      return fetchVercelStream(redirectUrl, clientReq, clientRes, maxRedirects - 1);
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
    console.error('Vercel Audio Proxy Stream Error:', err.message);
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
  fetchVercelStream(actualUrl, req, res);
});

export default app;
