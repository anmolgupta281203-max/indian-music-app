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
      params: { query: 'top hindi hits 2024', page: 1, limit: 20 }
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
      params: { query, page: 1, limit: 20 }
    });
    const results = response.data?.results || [];
    if (results.length > 0) {
      return results.map(normalizeSong).filter(Boolean);
    }
  } catch (error) {
    console.warn('Primary search failed, trying iTunes...', error);
  }

  // iTunes fallback (30s previews only — last resort)
  try {
    const itunesRes = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`
    );
    if (itunesRes.data?.results?.length > 0) {
      return itunesRes.data.results.map(item => ({
        id: String(item.trackId || item.collectionId),
        name: item.trackName || item.collectionName,
        album: item.collectionName || 'Single',
        year: item.releaseDate ? item.releaseDate.substring(0, 4) : '2025',
        duration: item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 240,
        primaryArtists: item.artistName || 'Various Artists',
        image: [
          { quality: '150x150', url: item.artworkUrl100 || '' },
          { quality: '500x500', url: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '' },
        ],
        downloadUrl: item.previewUrl ? [{ quality: '320kbps', url: item.previewUrl }] : [],
      }));
    }
  } catch (itunesErr) {
    console.warn('iTunes fallback error:', itunesErr);
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
      params: { query, page: 1, limit: 10 }
    });
    const results = response.data?.results || [];
    return results.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: (() => {
        const imgs = artist.image || [];
        const hq = imgs.find(i => i.quality === '500x500') || imgs[imgs.length - 1];
        return hq?.link || hq?.url || '';
      })(),
      url: artist.url,
    }));
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
};
