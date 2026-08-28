import axios from 'axios';

const apiClient = axios.create({ baseURL: '/api' });

// jiosaavn-api-2.vercel.app uses `link` field (not `url`) in downloadUrl and image arrays
const normalizeSong = (song) => {
  if (!song) return null;

  // Normalize downloadUrl: use direct CDN link
  const downloadUrl = (song.downloadUrl || []).map(d => ({
    quality: d.quality,
    url: d.link || d.url || '',
  })).filter(d => d.url);

  // Normalize image: handle both {link} and {url} formats
  const image = (song.image || []).map(img => ({
    quality: img.quality,
    url: img.link || img.url || '',
  }));

  return {
    id: song.id,
    name: song.name,
    album: typeof song.album === 'object' ? song.album?.name : (song.album || ''),
    year: song.year,
    duration: parseInt(song.duration) || 0,
    label: song.label,
    primaryArtists: song.primaryArtists || song.artist || '',
    image,
    downloadUrl,
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
  // Primary: jiosaavn-api-2 via our proxy
  try {
    const response = await apiClient.get('/search/songs', {
      params: { query, page: 1, limit: 50 }
    });
    const results = response.data?.results || [];
    if (results.length > 0) {
      return results.map(normalizeSong).filter(Boolean);
    }
  } catch (error) {
    console.warn('Primary search failed, trying iTunes...', error);
  }

  // YouTube fallback for full songs (replacing iTunes 30s previews)
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
          album: 'YouTube',
          year: new Date().getFullYear().toString(),
          duration: secs,
          primaryArtists: item.author?.name || 'YouTube',
          image: [
            { quality: '150x150', url: item.thumbnail },
            { quality: '500x500', url: item.thumbnail },
          ],
          downloadUrl: [], // Force PlayerContext to use YouTube
          youtubeId: item.videoId,
          isYouTubeFallback: true
        };
      });
    }
  } catch (ytErr) {
    console.warn('YT fallback error:', ytErr);
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
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
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


