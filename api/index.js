import axios from 'axios';

const SAAVN_API = 'https://saavn.dev/api';
const TMDB_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE = 'https://api.themoviedb.org/3';

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
    // ── TMDB PROXY ──────────────────────────────────────────────────────────
    if (url.includes('/tmdb/')) {
      const tmdbPath = url.replace(/^\/api\/tmdb/, '');
      // Strip any existing api_key to avoid duplicates, then add ours
      const cleanPath = tmdbPath.replace(/[?&]api_key=[^&]*/g, '');
      const sep = cleanPath.includes('?') ? '&' : '?';
      const tmdbUrl = `${TMDB_BASE}${cleanPath}${sep}api_key=${TMDB_KEY}`;
      const tmdbRes = await axios.get(tmdbUrl, { timeout: 10000 });
      return res.json(tmdbRes.data);
    }

    // ── SAAVN SEARCH SONGS ───────────────────────────────────────────────────
    if (url.includes('/search/songs') || searchParams.get('__call') === 'search.getResults') {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const page = searchParams.get('p') || searchParams.get('page') || '1';
      const limit = searchParams.get('n') || searchParams.get('limit') || '20';
      const data = await saavnProxy('/search/songs', { query: q, page, limit });
      return res.json(data);
    }

    // ── SAAVN SEARCH ALBUMS ──────────────────────────────────────────────────
    if (url.includes('/search/albums')) {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const data = await saavnProxy('/search/albums', { query: q, page: 1, limit: 20 });
      return res.json(data);
    }

    // ── SAAVN SEARCH ARTISTS ─────────────────────────────────────────────────
    if (url.includes('/search/artists')) {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const data = await saavnProxy('/search/artists', { query: q, page: 1, limit: 10 });
      return res.json(data);
    }

    // ── SAAVN ALBUM DETAILS ──────────────────────────────────────────────────
    if (url.includes('/albums') && searchParams.get('id')) {
      const data = await saavnProxy('/albums', { id: searchParams.get('id') });
      return res.json(data);
    }

    // ── SAAVN SONG DETAILS ───────────────────────────────────────────────────
    if (url.includes('/songs') && searchParams.get('id')) {
      const data = await saavnProxy('/songs', { id: searchParams.get('id') });
      return res.json(data);
    }

    // ── LEGACY: webapi.get (trending) ────────────────────────────────────────
    if (searchParams.get('__call') === 'webapi.get') {
      const data = await saavnProxy('/search/songs', { query: 'top hindi hits 2024', page: 1, limit: 20 });
      return res.json(data);
    }

    // ── LEGACY: content.getAlbumDetails ─────────────────────────────────────
    if (searchParams.get('__call') === 'content.getAlbumDetails') {
      const albumId = searchParams.get('albumid');
      const data = await saavnProxy('/albums', { id: albumId });
      return res.json(data);
    }

    // ── LEGACY: search.getArtistResults ─────────────────────────────────────
    if (searchParams.get('__call') === 'search.getArtistResults') {
      const q = searchParams.get('q') || '';
      const data = await saavnProxy('/search/artists', { query: q, page: 1, limit: 10 });
      return res.json(data);
    }

    // ── DEFAULT: saavn song search ───────────────────────────────────────────
    const q = searchParams.get('q') || searchParams.get('query') || 'trending';
    const data = await saavnProxy('/search/songs', { query: q, page: 1, limit: 20 });
    return res.json(data);

  } catch (err) {
    console.error('API proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
