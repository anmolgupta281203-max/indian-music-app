import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

// Helper to extract high quality image
const getHighQualityImage = (images) => {
  if (!images) return 'https://via.placeholder.com/500';
  // saavn.dev returns array: [{quality, url}]
  if (Array.isArray(images)) {
    const hq = images.find(i => i.quality === '500x500') || images[images.length - 1];
    return hq?.url || 'https://via.placeholder.com/500';
  }
  if (typeof images === 'string') {
    return images.replace('150x150', '500x500').replace('50x50', '500x500');
  }
  return 'https://via.placeholder.com/500';
};

// Normalize a song from saavn.dev format to our internal format
const normalizeSong = (song) => {
  if (!song) return null;

  // saavn.dev downloadUrl: [{quality: "96kbps", url: "..."}, ...]
  const downloadUrl = song.downloadUrl || [];

  return {
    id: song.id,
    name: song.name,
    album: song.album?.name || song.album || '',
    year: song.year,
    duration: song.duration,
    label: song.label,
    primaryArtists: Array.isArray(song.artists?.primary)
      ? song.artists.primary.map(a => a.name).join(', ')
      : (song.primaryArtists || ''),
    image: song.image || [],
    downloadUrl,
  };
};

export const fetchLyrics = async (songId) => {
  try {
    const res = await apiClient.get(`/songs/${songId}/lyrics`);
    if (res.data?.data?.lyrics) return res.data.data.lyrics;
  } catch (err) {
    console.error('Error fetching lyrics:', err);
  }
  return null;
};

export const fetchTrending = async () => {
  // Trending = top hindi hits via saavn.dev search
  try {
    const response = await apiClient.get('/search/songs', {
      params: { query: 'top hindi hits 2024', page: 1, limit: 20 }
    });

    const results = response.data?.data?.results || [];
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

  // Fallback
  const fallbackSongs = await searchSongs('Arijit Singh');
  const fallbackAlbums = await searchSongs('Pritam');
  return { trending: { songs: fallbackSongs, albums: fallbackAlbums } };
};

export const searchSongs = async (query) => {
  // Strategy 1: saavn.dev via our proxy
  try {
    const response = await apiClient.get('/search/songs', {
      params: { query, page: 1, limit: 20 }
    });

    const results = response.data?.data?.results || [];
    if (results.length > 0) {
      return results.map(normalizeSong).filter(Boolean);
    }
  } catch (error) {
    console.warn('saavn.dev search failed, trying iTunes...', error);
  }

  // Strategy 2: Apple iTunes fallback (30s previews only)
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
    const album = response.data?.data;
    if (!album) return null;

    const songs = (album.songs || []).map(normalizeSong).filter(Boolean);
    return {
      id: album.id,
      name: album.name,
      artist: Array.isArray(album.artists?.primary)
        ? album.artists.primary.map(a => a.name).join(', ')
        : album.primaryArtists || '',
      year: album.year,
      image: getHighQualityImage(album.image),
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
    const results = response.data?.data?.results || [];
    return results.map(artist => ({
      id: artist.id,
      name: artist.name,
      image: getHighQualityImage(artist.image),
      url: artist.url,
    }));
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
};
