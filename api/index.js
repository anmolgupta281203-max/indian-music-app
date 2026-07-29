import axios from 'axios';

const SAAVN_API = 'https://saavn.dev/api';

// Helper: forward request to saavn.dev
async function saavnProxy(path, params = {}) {
  const res = await axios.get(`${SAAVN_API}${path}`, {
    params,
    timeout: 12000,
    headers: { 'Accept': 'application/json' }
  });
  return res.data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const { searchParams } = new URL(url, 'http://localhost');

  try {
    // Route: /api/search/songs?q=...
    if (url.includes('/search/songs') || searchParams.get('__call') === 'search.getResults') {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const page = searchParams.get('p') || '1';
      const limit = searchParams.get('n') || '20';
      const data = await saavnProxy('/search/songs', { query: q, page, limit });
      return res.json(data);
    }

    // Route: /api/search/albums?q=...
    if (url.includes('/search/albums')) {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const data = await saavnProxy('/search/albums', { query: q, page: 1, limit: 20 });
      return res.json(data);
    }

    // Route: /api/albums?id=...
    if (url.includes('/albums') && searchParams.get('id')) {
      const data = await saavnProxy('/albums', { id: searchParams.get('id') });
      return res.json(data);
    }

    // Route: /api/songs?id=...
    if (url.includes('/songs') && searchParams.get('id')) {
      const data = await saavnProxy('/songs', { id: searchParams.get('id') });
      return res.json(data);
    }

    // Legacy: /api?__call=webapi.get (trending)
    if (searchParams.get('__call') === 'webapi.get') {
      const data = await saavnProxy('/search/songs', { query: 'top hindi hits 2024', page: 1, limit: 20 });
      return res.json(data);
    }

    // Legacy: /api?__call=content.getAlbumDetails&albumid=...
    if (searchParams.get('__call') === 'content.getAlbumDetails') {
      const albumId = searchParams.get('albumid');
      const data = await saavnProxy('/albums', { id: albumId });
      return res.json(data);
    }

    // Legacy: /api?__call=search.getArtistResults
    if (searchParams.get('__call') === 'search.getArtistResults') {
      const q = searchParams.get('q') || '';
      const data = await saavnProxy('/search/artists', { query: q, page: 1, limit: 10 });
      return res.json(data);
    }

    // Default: proxy all to saavn.dev search
    const q = searchParams.get('q') || searchParams.get('query') || 'trending';
    const data = await saavnProxy('/search/songs', { query: q, page: 1, limit: 20 });
    return res.json(data);

  } catch (err) {
    console.error('API proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
