import axios from 'axios';
import CryptoJS from 'crypto-js';
import ytSearch from 'yt-search';

const TMDB_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_BASE = 'https://api.themoviedb.org/3';

// ── NATIVE JIOSAAVN WRAPPER ───────────────────────────────────────────────────

function decryptUrl(encryptedUrl) {
  if (!encryptedUrl) return '';
  try {
    const key = CryptoJS.enc.Utf8.parse('38346591');
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    let url = decrypted.toString(CryptoJS.enc.Utf8);
    url = url.replace('audios.saavncdn.com', 'aac.saavncdn.com');
    url = url.replace('_master_d.mpd', '_320.mp4');
    url = url.replace('_96.mp4', '_320.mp4');
    return url;
  } catch (e) {
    console.error('Decryption error:', e);
    return '';
  }
}

function normalizeRawSong(song) {
  if (!song) return null;
  return {
    id: song.id,
    name: song.title || song.song || '',
    album: song.album || '',
    year: song.year || '',
    duration: parseInt(song.duration) || 0,
    label: song.label || '',
    primaryArtists: song.primary_artists || song.singers || song.subtitle || '',
    image: [{ quality: '500x500', url: (song.image || '').replace('150x150', '500x500') }],
    downloadUrl: [{ quality: '320kbps', url: decryptUrl(song.encrypted_media_url || song.encrypted_drm_media_url) }]
  };
}

async function fetchJioSaavnRaw(params) {
  const defaultParams = { 
    _format: 'json', 
    _marker: 0, 
    ctx: 'web6dot0', 
    api_version: 4,
    languages: 'urdu,hindi,punjabi,english'
  };
  const res = await axios.get('https://www.jiosaavn.com/api.php', {
    params: { ...defaultParams, ...params },
    headers: {
      'Origin': 'https://www.jiosaavn.com',
      'Referer': 'https://www.jiosaavn.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': 'L=urdu%2Chindi%2Cpunjabi%2Cenglish;'
    }
  });
  
  // The API sometimes returns a plain text string instead of json if it fails or has ads
  if (typeof res.data === 'string') {
     try {
       return JSON.parse(res.data.trim());
     } catch(e) {
       return {};
     }
  }
  return res.data;
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const { searchParams } = new URL(url, 'http://localhost');

  try {
    // ── AUDIO STREAM PROXY ───────────────────────────────────────────────────
    if (url.includes('/stream')) {
      const audioUrl = searchParams.get('url');
      if (!audioUrl) return res.status(400).json({ error: 'Missing url param' });

      const decoded = decodeURIComponent(audioUrl);
      const audioRes = await axios.get(decoded, {
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.jiosaavn.com/',
          'Origin': 'https://www.jiosaavn.com',
          'Accept': '*/*',
          'Range': req.headers['range'] || 'bytes=0-',
        },
      });

      const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
      headersToForward.forEach(h => {
        if (audioRes.headers[h]) res.setHeader(h, audioRes.headers[h]);
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const statusCode = audioRes.status === 206 ? 206 : 200;
      res.status(statusCode);
      audioRes.data.pipe(res);
      return;
    }

    // ── TMDB PROXY ──────────────────────────────────────────────────────────
    if (url.includes('/tmdb/')) {
      const tmdbPath = url.replace(/^\/api\/tmdb/, '');
      const cleanPath = tmdbPath.replace(/[?&]api_key=[^&]*/g, '');
      const sep = cleanPath.includes('?') ? '&' : '?';
      const tmdbUrl = `${TMDB_BASE}${cleanPath}${sep}api_key=${TMDB_KEY}`;
      const tmdbRes = await axios.get(tmdbUrl, { timeout: 10000 });
      return res.json(tmdbRes.data);
    }

    // ── SAAVN SEARCH SONGS ───────────────────────────────────────────────────
    if (url.includes('/search/songs') || searchParams.get('__call') === 'search.getResults' || searchParams.get('__call') === 'webapi.get') {
      let q = searchParams.get('q') || searchParams.get('query') || '';
      if (searchParams.get('__call') === 'webapi.get') q = 'top hindi hits 2026';
      
      const page = searchParams.get('p') || searchParams.get('page') || '1';
      const limit = searchParams.get('n') || searchParams.get('limit') || '20';
      
      const rawData = await fetchJioSaavnRaw({ __call: 'search.getResults', q, p: page, n: limit });
      let results = (rawData.results || []).map(normalizeRawSong).filter(Boolean);

      // If JioSaavn has 0 results (e.g. exclusive Pakistani / Coke studio / indie songs), fallback to YouTube
      if (results.length === 0 && q.trim().length > 0) {
        try {
          const ytRes = await ytSearch(q.includes('song') || q.includes('music') ? q : `${q} song`);
          const vids = (ytRes?.videos || []).filter(v => v.seconds < 600).slice(0, parseInt(limit, 10));
          results = vids.map(v => ({
            id: v.videoId,
            name: v.title,
            album: 'YouTube Music',
            year: new Date().getFullYear().toString(),
            duration: v.seconds || 240,
            label: 'YouTube',
            primaryArtists: v.author?.name || 'Artist',
            image: [{ quality: '500x500', url: v.thumbnail || '' }],
            downloadUrl: [],
            youtubeId: v.videoId,
            isYouTubeFallback: true
          }));
        } catch (e) {
          console.warn('YT fallback search failed:', e.message);
        }
      }

      return res.json({ results });
    }

    // ── SAAVN SEARCH ALBUMS ──────────────────────────────────────────────────
    if (url.includes('/search/albums')) {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const rawData = await fetchJioSaavnRaw({ __call: 'search.getAlbumResults', q, p: 1, n: 20 });
      return res.json({ results: rawData.results || [] });
    }

    // ── SAAVN SEARCH ARTISTS ─────────────────────────────────────────────────
    if (url.includes('/search/artists') || searchParams.get('__call') === 'search.getArtistResults') {
      const q = searchParams.get('q') || searchParams.get('query') || '';
      let results = [];

      try {
        const rawData = await fetchJioSaavnRaw({ __call: 'search.getArtistResults', q, p: 1, n: 10 });
        results = (rawData.results || []).map(artist => ({
           id: artist.id || artist.artistid,
           name: artist.title || artist.name,
           url: artist.url,
           image: [{ quality: '500x500', url: (artist.image || '').replace('150x150', '500x500').replace('50x50', '500x500') }]
        })).filter(a => a.name);
      } catch (e) {}

      // Fallback: autocomplete.get for top artists
      if (results.length === 0 && q.trim()) {
        try {
          const autoData = await fetchJioSaavnRaw({ __call: 'autocomplete.get', query: q });
          if (autoData.artists?.data?.length > 0) {
            results = autoData.artists.data.map(artist => ({
              id: artist.id,
              name: artist.title || artist.name,
              url: artist.url,
              image: [{ quality: '500x500', url: (artist.image || '').replace('150x150', '500x500').replace('50x50', '500x500') }]
            })).filter(a => a.name);
          }
        } catch (e) {}
      }

      // Fallback: Saavn public dev API
      if (results.length === 0 && q.trim()) {
        try {
          const pubRes = await axios.get(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(q)}&page=1&limit=10`, { timeout: 3500 });
          if (pubRes.data?.data?.results?.length > 0) {
            results = pubRes.data.data.results.map(artist => {
              let img = '';
              if (Array.isArray(artist.image)) {
                img = artist.image[artist.image.length - 1]?.url || '';
              }
              return {
                id: artist.id,
                name: artist.name,
                url: artist.url,
                image: [{ quality: '500x500', url: img }]
              };
            });
          }
        } catch (e) {}
      }

      return res.json({ results });
    }

    // ── SAAVN ARTIST DETAILS & TOP SONGS ─────────────────────────────────────
    if (url.includes('/artists') && !url.includes('/search')) {
      const artistId = searchParams.get('id');
      const q = searchParams.get('q') || searchParams.get('query') || '';
      const searchQuery = q || artistId;
      const rawData = await fetchJioSaavnRaw({ __call: 'search.getResults', q: searchQuery, p: 1, n: 50 });
      const songs = (rawData.results || []).map(normalizeRawSong).filter(Boolean);
      return res.json({ id: artistId, name: q || 'Artist', songs, topSongs: songs });
    }

    // ── SAAVN ALBUM DETAILS ──────────────────────────────────────────────────
    if (url.includes('/albums') || searchParams.get('__call') === 'content.getAlbumDetails') {
      const albumId = searchParams.get('id') || searchParams.get('albumid');
      if (albumId) {
        const rawData = await fetchJioSaavnRaw({ __call: 'content.getAlbumDetails', albumid: albumId });
        const songs = (rawData.songs || rawData.list || []).map(normalizeRawSong).filter(Boolean);
        return res.json({
           id: rawData.albumid,
           name: rawData.title,
           year: rawData.year,
           primaryArtists: rawData.primary_artists,
           image: [{ quality: '500x500', url: (rawData.image || '').replace('150x150', '500x500') }],
           songs
        });
      }
    }

    // ── SAAVN SONG LYRICS ───────────────────────────────────────────────────
    if (url.includes('/lyrics')) {
       return res.json({ lyrics: '' });
    }

    // ── SAAVN SONG DETAILS ───────────────────────────────────────────────────
    if (url.includes('/songs') && !url.includes('/search') && !url.includes('/albums') && !url.includes('/stream')) {
      const id = searchParams.get('id');
      if (id) {
        const rawData = await fetchJioSaavnRaw({ __call: 'song.getDetails', pids: id });
        const songData = rawData[id] || rawData;
        const normalized = normalizeRawSong(songData);
        // api.js usually expects an array of songs or a song object. 
        // Vercel proxy usually returns a single song array or object. We'll return the object.
        return res.json([normalized]);
      }
    }

    // ── DEFAULT ──────────────────────────────────────────────────────────────
    const q = searchParams.get('q') || searchParams.get('query') || 'trending hindi';
    const rawData = await fetchJioSaavnRaw({ __call: 'search.getResults', q, p: 1, n: 20 });
    const results = (rawData.results || []).map(normalizeRawSong).filter(Boolean);
    return res.json({ results });

  } catch (err) {
    console.error('API proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
