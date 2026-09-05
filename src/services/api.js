import axios from 'axios';

const decodeHtml = (html) => {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }
  return html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

const apiClient = axios.create({ baseURL: '/api', timeout: 3500 });

// jiosaavn-api-2 uses `link` field (not `url`) in downloadUrl and image arrays
const normalizeSong = (song) => {
  if (!song) return null;

  // Normalize downloadUrl: use direct CDN link and fix any legacy suffixes
  let downloadUrl = (song.downloadUrl || []).map(d => {
    let rawUrl = d.link || d.url || '';
    if (rawUrl) {
      rawUrl = rawUrl.replace('audios.saavncdn.com', 'aac.saavncdn.com');
      rawUrl = rawUrl.replace(/(_master[^/]*|\.mpd|\.m3u8)(\?.*)?$/, '_320.mp4');
    }
    return {
      quality: d.quality || '320kbps',
      url: rawUrl,
    };
  }).filter(d => d.url);

  // If we have at least one Saavn CDN URL, ensure all bitrate variants are available
  const firstSaavn = downloadUrl.find(d => d.url.includes('aac.saavncdn.com'));
  if (firstSaavn) {
    const baseWithoutSuffix = firstSaavn.url.replace(/(_master[^/]*|_\d+\.[a-zA-Z0-9]+|\.mpd|\.m3u8)(\?.*)?$/, '');
    const standardQualities = [
      { quality: '320kbps', url: `${baseWithoutSuffix}_320.mp4` },
      { quality: '160kbps', url: `${baseWithoutSuffix}_160.mp4` },
      { quality: '96kbps', url: `${baseWithoutSuffix}_96.mp4` },
      { quality: '48kbps', url: `${baseWithoutSuffix}_48.mp4` }
    ];
    standardQualities.forEach(sq => {
      if (!downloadUrl.some(d => d.quality === sq.quality)) {
        downloadUrl.push(sq);
      }
    });
  }

  // Normalize image: handle both {link} and {url} formats
  let image = (song.image || []).map(img => ({
    quality: img.quality,
    url: img.link || img.url || '',
  })).filter(img => img.url);

  if (image.length === 0 && song.thumbnail) {
    image = [
      { quality: '150x150', url: song.thumbnail },
      { quality: '500x500', url: song.thumbnail }
    ];
  }

  const ytId = song.youtubeId || song.videoId || (song.isYouTubeFallback ? song.id : undefined);

  return {
    id: song.id || song.song_id || ytId,
    name: song.name || song.title || song.song,
    album: typeof song.album === 'object' ? song.album?.name : (song.album || 'Single'),
    year: song.year || new Date().getFullYear().toString(),
    duration: parseInt(song.duration) || 0,
    label: song.label || 'Music',
    primaryArtists: song.primaryArtists || song.primary_artists || song.singers || song.artist || 'Artist',
    image,
    downloadUrl,
    youtubeId: ytId,
    isYouTubeFallback: song.isYouTubeFallback || (downloadUrl.length === 0 && !!ytId)
  };
};

export const fetchLyrics = async (songId) => {
  try {
    const res = await apiClient.get(`/songs/${songId}/lyrics`);
    if (res.data?.lyrics) return res.data.lyrics;
  } catch (err) {
    console.error('Error fetching lyrics:', err);
  }
  return null;
};

export const fetchTrending = async () => {
  try {
    const response = await apiClient.get('/search/songs', {
      params: { query: 'top hindi hits 2026', page: 1, limit: 20 }
    });
    const results = response.data?.results || [];
    if (results.length > 0) {
      return {
        trending: {
          songs: results.map(normalizeSong).filter(Boolean),
          albums: []
        }
      };
    }
  } catch (error) {
    console.error('Trending fetch error:', error);
  }

  const fallbackSongs = await searchSongs('Arijit Singh');
  const fallbackAlbums = await searchSongs('Pritam');
  return { trending: { songs: fallbackSongs, albums: fallbackAlbums } };
};

export const searchSongs = async (query) => {
  // Primary: JioSaavn via backend proxy
  try {
    const response = await apiClient.get('/search/songs', {
      params: { query, page: 1, limit: 50 }
    });
    const results = response.data?.results || [];
    if (results.length > 0) {
      return results.map(normalizeSong).filter(Boolean);
    }
  } catch (error) {
    console.warn('Primary JioSaavn search failed, trying public endpoints...', error);
  }

  // Dual Fallback: direct public JioSaavn endpoints with Pakistani/Urdu catalog
  try {
    const directRes = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=40`, { timeout: 4000 });
    if (directRes.data?.data?.results?.length > 0) {
      return directRes.data.data.results.map(normalizeSong).filter(Boolean);
    }
  } catch (e) {}

  try {
    const directRes2 = await axios.get(`https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodeURIComponent(query)}&page=1&limit=40`, { timeout: 4000 });
    if (directRes2.data?.data?.results?.length > 0) {
      return directRes2.data.data.results.map(normalizeSong).filter(Boolean);
    }
  } catch (e) {}

  // YouTube / Invidious fallback for normal audio songs
  try {
    const ytRes = await axios.get(`/api/yt-search?q=${encodeURIComponent(query)}`);
    if (ytRes.data?.results?.length > 0) {
      return ytRes.data.results.map(item => {
        let secs = 240;
        if (item.timestamp) {
          const parts = item.timestamp.split(':');
          if (parts.length === 2) {
            secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          } else if (parts.length === 3) {
            secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
          }
        }
        return {
          id: item.videoId,
          name: item.title,
          album: 'Single / Track',
          year: new Date().getFullYear().toString(),
          duration: secs,
          primaryArtists: item.author?.name || 'Artist',
          image: [
            { quality: '150x150', url: item.thumbnail },
            { quality: '500x500', url: item.thumbnail },
          ],
          downloadUrl: [],
          youtubeId: item.videoId,
          isYouTubeFallback: true
        };
      });
    }
  } catch (ytErr) {
    console.warn('YT fallback error:', ytErr);
  }

  // Direct Invidious fallback for normal audio songs
  const instances = ['https://iv.melmac.space', 'https://invidious.jing.rocks', 'https://vid.puffyan.us'];
  for (const url of instances) {
    try {
      const invRes = await axios.get(`${url}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, { timeout: 3500 });
      if (invRes.data && Array.isArray(invRes.data) && invRes.data.length > 0) {
        return invRes.data.slice(0, 20).map(v => {
          let bestThumb = 'https://via.placeholder.com/500x500';
          if (v.videoThumbnails && v.videoThumbnails.length > 0) {
            const targetThumb = v.videoThumbnails.find(t => t.quality === 'medium' || t.quality === 'high' || t.quality === 'maxresdefault');
            bestThumb = targetThumb ? targetThumb.url : v.videoThumbnails[0].url;
          }
          return {
            id: v.videoId,
            name: v.title,
            album: 'Single / Track',
            year: new Date().getFullYear().toString(),
            duration: v.lengthSeconds || 240,
            primaryArtists: v.author || 'Artist',
            image: [
              { quality: '150x150', url: bestThumb },
              { quality: '500x500', url: bestThumb }
            ],
            downloadUrl: [],
            youtubeId: v.videoId,
            isYouTubeFallback: true
          };
        });
      }
    } catch (e) {}
  }

  return [];
};

export const fetchAlbumDetails = async (albumId) => {
  try {
    const response = await apiClient.get('/albums', { params: { id: albumId } });
    const album = response.data;
    if (!album) return null;

    const songs = (album.songs || []).map(normalizeSong).filter(Boolean);
    return {
      id: album.id,
      name: album.name,
      artist: album.primaryArtists || '',
      year: album.year,
      image: (() => {
        const imgs = album.image || [];
        const hq = imgs.find(i => i.quality === '500x500') || imgs[imgs.length - 1];
        return hq?.link || hq?.url || '';
      })(),
      songs,
    };
  } catch (error) {
    console.error('Error fetching album details:', error);
    return null;
  }
};

export const searchArtists = async (query) => {
  try {
    const response = await apiClient.get('/search/artists', {
      params: { query, page: 1, limit: 20 }
    });
    const results = response.data?.results || [];
    if (results.length > 0) {
      return results.map(artist => {
        let imgUrl = '';
        if (Array.isArray(artist.image)) {
          const hq = artist.image.find(i => i.quality === '500x500') || artist.image[artist.image.length - 1];
          imgUrl = hq?.url || hq?.link || '';
        } else if (typeof artist.image === 'string') {
          imgUrl = artist.image.replace('150x150', '500x500').replace('50x50', '500x500');
        }
        return {
          id: artist.id,
          name: decodeHtml(artist.name || artist.title || ''),
          image: imgUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
          url: artist.url,
        };
      });
    }
  } catch (error) {
    console.warn('Backend search artists failed, trying direct public fallback:', error);
  }

  // Direct public fallback
  try {
    const pubRes = await axios.get(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(query)}&page=1&limit=10`, { timeout: 3500 });
    if (pubRes.data?.data?.results?.length > 0) {
      return pubRes.data.data.results.map(artist => {
        let imgUrl = '';
        if (Array.isArray(artist.image)) {
          const hq = artist.image[artist.image.length - 1];
          imgUrl = hq?.url || '';
        }
        return {
          id: artist.id,
          name: decodeHtml(artist.name || ''),
          image: imgUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
          url: artist.url,
        };
      });
    }
  } catch (e) {}

  return [];
};

export const fetchArtistTopSongs = async (artistId, artistName = '') => {
  try {
    const response = await apiClient.get('/artists', { params: { id: artistId, q: artistName } });
    if (response.data?.topSongs?.length > 0) {
      return response.data.topSongs.map(normalizeSong).filter(Boolean);
    }
    if (response.data?.songs?.length > 0) {
      return response.data.songs.map(normalizeSong).filter(Boolean);
    }
  } catch (error) {
    console.warn('Error fetching artist top songs by ID:', error);
  }

  if (artistName || artistId) {
    return await searchSongs(artistName || artistId);
  }
  return [];
};

export const getSongDetails = async (songId) => {
  if (!songId) return null;
  try {
    const res = await apiClient.get('/songs', { params: { id: songId } });
    if (res.data) {
      const songData = Array.isArray(res.data) ? res.data[0] : res.data;
      return normalizeSong(songData);
    }
  } catch (e) {
    console.warn('Error fetching song details:', e);
  }
  return null;
};
