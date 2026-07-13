import axios from 'axios';
import CryptoJS from 'crypto-js';

const apiClient = axios.create({
  baseURL: '/api',
});

// Helper to extract high quality image
const getHighQualityImage = (url) => {
  if (!url) return 'https://via.placeholder.com/150';
  return url.replace('150x150', '500x500').replace('50x50', '500x500');
};

// Helper to decrypt JioSaavn media URL
const decryptUrl = (encryptedUrl) => {
  if (!encryptedUrl) return null;
  try {
    const key = CryptoJS.enc.Utf8.parse("38346591");
    const decrypted = CryptoJS.DES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl) },
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
    
    // Convert to highest quality mp4
    return decrypted.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4');
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
};

export const fetchTrending = async () => {
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'webapi.getLaunchData',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });

    const data = response.data;
    
    // Process trending songs
    const songs = (data.new_trending || [])
      .filter(item => item.type === 'song' && item.details && (item.details.encrypted_media_url || item.details.vlink))
      .map(item => {
        const d = item.details;
        const audioUrl = decryptUrl(d.encrypted_media_url) || d.vlink;
        return {
          id: d.id,
          name: d.song || d.title,
          primaryArtists: d.primary_artists || d.singers,
          image: [{ url: getHighQualityImage(d.image) }],
          downloadUrl: [{ url: audioUrl }]
        };
      });

    // Process trending albums
    const albums = (data.new_trending || [])
      .filter(item => item.type === 'album' && item.details)
      .map(item => {
        const d = item.details;
        return {
          id: d.albumid || d.id,
          name: d.title,
          image: [{ url: getHighQualityImage(d.image) }]
        };
      });

    // Process new albums (latest releases)
    const latestAlbums = (data.new_albums || []).map(item => {
      return {
        id: item.albumid || item.id,
        name: item.title,
        image: [{ url: getHighQualityImage(item.image) }]
      };
    });

    return {
      trending: {
        songs: songs,
        albums: albums,
        latestAlbums: latestAlbums
      }
    };
  } catch (error) {
    console.error('Error fetching trending data:', error);
    return null;
  }
};

export const searchSongs = async (query) => {
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'search.getResults',
        q: query,
        p: 1,
        n: 50,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });

    const data = response.data;
    const songs = (data.results || [])
      .map(item => {
        const audioUrl = decryptUrl(item.encrypted_media_url) || item.vlink;
        return {
          id: item.id,
          name: item.song || item.title || 'Unknown Title',
          primaryArtists: item.primary_artists || item.singers || item.subtitle || 'Unknown Artist',
          image: [{ url: getHighQualityImage(item.image) }],
          downloadUrl: [{ url: audioUrl }]
        };
      }).filter(item => item.downloadUrl[0].url != null);

    // Always append YouTube results to expand the catalog
    try {
      const ytRes = await axios.get(`/api/yt-search?q=${encodeURIComponent(query)}`);
      if (ytRes.data && ytRes.data.results) {
        const ytSongs = ytRes.data.results.map(v => ({
          id: v.videoId,
          name: v.title,
          primaryArtists: v.author?.name || 'YouTube',
          image: [{ url: v.thumbnail }],
          youtubeId: v.videoId // specifically mark as youtube video
        }));
        
        // Merge YouTube results at the end
        return [...songs, ...ytSongs];
      }
    } catch (ytErr) {
      console.error('YouTube fallback failed:', ytErr);
    }

    return songs;
  } catch (error) {
    console.error('Error searching songs:', error);
    return [];
  }
};

export const fetchAlbumDetails = async (albumid) => {
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'content.getAlbumDetails',
        albumid: albumid,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });

    const data = response.data;
    const songs = (data.songs || [])
      .map(item => {
        const audioUrl = decryptUrl(item.encrypted_media_url) || item.vlink;
        return {
          id: item.id,
          name: item.song || item.title,
          primaryArtists: item.primary_artists || item.singers,
          image: [{ url: getHighQualityImage(item.image) }],
          downloadUrl: [{ url: audioUrl }]
        };
      }).filter(item => item.downloadUrl[0].url != null);

    return songs;
  } catch (error) {
    console.error('Error fetching album details:', error);
    return [];
  }
};

export const searchArtists = async (query) => {
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'autocomplete.get',
        query: query,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });

    const data = response.data;
    if (data && data.artists && data.artists.data) {
      return data.artists.data.map(artist => ({
        id: artist.id,
        name: artist.title,
        image: [{ url: getHighQualityImage(artist.image) }],
        type: 'artist'
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
};

export const fetchArtistTopSongs = async (artistId) => {
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'artist.getArtistPageDetails',
        artistId: artistId,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });

    const data = response.data;
    const songs = (data.topSongs || [])
      .map(item => {
        const audioUrl = decryptUrl(item.encrypted_media_url) || item.vlink;
        return {
          id: item.id,
          name: item.song || item.title,
          primaryArtists: item.primary_artists || item.singers || data.name,
          image: [{ url: getHighQualityImage(item.image) }],
          downloadUrl: [{ url: audioUrl }]
        };
      }).filter(item => item.downloadUrl[0].url != null);

    return songs;
  } catch (error) {
    console.error('Error fetching artist top songs:', error);
    return [];
  }
};
