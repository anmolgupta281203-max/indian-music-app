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

const createDownloadUrls = (audioUrl) => {
  if (!audioUrl) return [];

  const cleanUrl = audioUrl.trim();
  const formatMatch = cleanUrl.match(/_(12|48|96|160|320)\.(mp4|mp3)/i);

  if (formatMatch) {
    const ext = formatMatch[2];
    const url96 = cleanUrl.replace(/_(12|48|96|160|320)\.(mp4|mp3)/i, `_96.${ext}`);
    const url160 = cleanUrl.replace(/_(12|48|96|160|320)\.(mp4|mp3)/i, `_160.${ext}`);
    const url320 = cleanUrl.replace(/_(12|48|96|160|320)\.(mp4|mp3)/i, `_320.${ext}`);

    return [
      { quality: '96kbps', url: url96 },
      { quality: '160kbps', url: url160 },
      { quality: '320kbps', url: url320 }
    ];
  }

  return [
    { quality: '320kbps', url: cleanUrl }
  ];
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
    
    return decrypted && decrypted.length > 5 ? decrypted : null;
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
};

export const fetchLyrics = async (songId) => {
  try {
    const res = await axios.get(`https://saavn.dev/api/songs/${songId}/lyrics`);
    if (res.data && res.data.data && res.data.data.lyrics) {
      return res.data.data.lyrics;
    }
  } catch (e) {
    console.warn("Primary lyrics API failed, trying fallback...", e);
  }
  
  try {
    const res = await apiClient.get('', {
      params: {
        __call: 'lyrics.getLyrics',
        lyrics_id: songId,
        ctx: 'web6dot0',
        api_version: 4,
        _format: 'json',
        _marker: 0
      }
    });
    if (res.data && res.data.lyrics) {
      return res.data.lyrics;
    }
  } catch (err) {
    console.error("Error fetching lyrics:", err);
  }
  return null;
};

export const fetchTrending = async () => {
  // Strategy 1: Direct Saavn.dev Modules API
  try {
    const res = await axios.get('https://saavn.dev/api/modules?language=hindi,punjabi,english');
    if (res.data && res.data.data && res.data.data.trending) {
      const trendingSongs = (res.data.data.trending.songs || []).map(song => ({
        id: song.id,
        name: song.name,
        album: song.album?.name || song.album,
        year: song.year,
        duration: song.duration,
        label: song.label,
        primaryArtists: song.artists?.primary?.map(a => a.name).join(', ') || song.primaryArtists,
        image: [
          { quality: '150x150', url: song.image ? song.image[0]?.url : 'https://via.placeholder.com/150' },
          { quality: '500x500', url: song.image ? (song.image[song.image.length - 1]?.url || song.image[0]?.url) : 'https://via.placeholder.com/500' }
        ],
        downloadUrl: song.downloadUrl || []
      }));

      const trendingAlbums = (res.data.data.trending.albums || res.data.data.albums || []).map(album => ({
        id: album.id,
        name: album.name,
        artist: album.artists?.primary?.map(a => a.name).join(', ') || album.artist,
        year: album.year,
        image: [
          { quality: '150x150', url: album.image ? album.image[0]?.url : 'https://via.placeholder.com/150' },
          { quality: '500x500', url: album.image ? (album.image[album.image.length - 1]?.url || album.image[0]?.url) : 'https://via.placeholder.com/500' }
        ]
      }));

      return {
        trending: {
          songs: trendingSongs,
          albums: trendingAlbums
        }
      };
    }
  } catch (err) {
    console.warn("Saavn.dev modules API failed, trying JioSaavn proxy...", err);
  }

  // Strategy 2: JioSaavn WebAPI
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'webapi.get',
        token: '86427303',
        type: 'playlist',
        p: '1',
        n: '20',
        includeMetaTags: '0',
        ctx: 'web6dot0',
        api_version: '4',
        _format: 'json',
        _marker: '0'
      }
    });

    if (response.data) {
      let rawSongs = response.data.list || (Array.isArray(response.data) ? response.data : []);
      const songs = rawSongs.map(song => {
        const rawEnc = song.more_info?.encrypted_media_url;
        const decrypted = decryptUrl(rawEnc);
        const audioUrl = decrypted || song.more_info?.media_preview_url || song.media_preview_url;
        
        return {
          id: song.id,
          name: song.title || song.song,
          album: song.more_info?.album || song.album,
          year: song.year,
          releaseDate: song.more_info?.release_date,
          duration: song.more_info?.duration,
          label: song.more_info?.music || song.label,
          primaryArtists: song.more_info?.artistMap?.primary_artists?.map(a => a.name).join(', ') || song.more_info?.singers || song.singers,
          image: [
            { quality: '150x150', url: song.image },
            { quality: '500x500', url: getHighQualityImage(song.image) }
          ],
          downloadUrl: createDownloadUrls(audioUrl)
        };
      });

      return {
        trending: {
          songs: songs,
          albums: []
        }
      };
    }
  } catch (error) {
    console.error("JioSaavn proxy trending error:", error);
  }

  // Fallback strategy
  const fallbackSongs = await searchSongs('Arijit Singh');
  const fallbackAlbums = await searchSongs('Pritam');
  return {
    trending: {
      songs: fallbackSongs,
      albums: fallbackAlbums
    }
  };
};

export const searchSongs = async (query, isCustomSearch = true) => {
  // Strategy 1: Direct Saavn.dev API Call
  try {
    const res = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
    if (res.data && res.data.data && res.data.data.results && res.data.data.results.length > 0) {
      return res.data.data.results.map(song => ({
        id: song.id,
        name: song.name,
        album: song.album?.name || song.album,
        year: song.year,
        duration: song.duration,
        label: song.label,
        primaryArtists: song.artists?.primary?.map(a => a.name).join(', ') || song.primaryArtists,
        image: [
          { quality: '150x150', url: song.image ? song.image[0]?.url : 'https://via.placeholder.com/150' },
          { quality: '500x500', url: song.image ? (song.image[song.image.length - 1]?.url || song.image[0]?.url) : 'https://via.placeholder.com/500' }
        ],
        downloadUrl: song.downloadUrl || []
      }));
    }
  } catch (err) {
    console.warn("Primary saavn.dev search failed, attempting serverless proxy fallback...", err);
  }

  // Strategy 2: Serverless Proxy API Call
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'search.getResults',
        q: query,
        p: '1',
        n: '20',
        ctx: 'web6dot0',
        api_version: '4',
        _format: 'json',
        _marker: '0'
      }
    });

    if (response.data && typeof response.data === 'object' && response.data.results) {
      return response.data.results.map(song => {
        const rawEnc = song.more_info?.encrypted_media_url;
        const decrypted = decryptUrl(rawEnc);
        const audioUrl = decrypted || song.more_info?.media_preview_url || song.media_preview_url;
        
        return {
          id: song.id,
          name: song.title || song.song,
          album: song.more_info?.album || song.album,
          year: song.year,
          duration: song.more_info?.duration,
          label: song.more_info?.music || song.label,
          primaryArtists: song.more_info?.singers || song.singers || song.more_info?.artistMap?.primary_artists?.map(a => a.name).join(', '),
          image: [
            { quality: '150x150', url: song.image },
            { quality: '500x500', url: getHighQualityImage(song.image) }
          ],
          downloadUrl: createDownloadUrls(audioUrl)
        };
      });
    }
  } catch (error) {
    console.error("Secondary proxy search failed:", error);
  }

  return [];
};

export const fetchAlbumDetails = async (albumId) => {
  try {
    const res = await axios.get(`https://saavn.dev/api/albums?id=${albumId}`);
    if (res.data && res.data.data) {
      const album = res.data.data;
      return {
        id: album.id,
        name: album.name,
        artist: album.artists?.primary?.map(a => a.name).join(', '),
        year: album.year,
        image: album.image ? (album.image[album.image.length - 1]?.url || album.image[0]?.url) : 'https://via.placeholder.com/500',
        songs: (album.songs || []).map(song => ({
          id: song.id,
          name: song.name,
          album: album.name,
          year: song.year,
          duration: song.duration,
          primaryArtists: song.artists?.primary?.map(a => a.name).join(', '),
          image: song.image,
          downloadUrl: song.downloadUrl || []
        }))
      };
    }
  } catch (e) {
    console.warn("Primary album details failed, trying proxy...", e);
  }

  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'content.getAlbumDetails',
        albumid: albumId,
        ctx: 'web6dot0',
        api_version: '4',
        _format: 'json',
        _marker: '0'
      }
    });

    if (!response.data) return null;

    const album = response.data;
    const songs = (album.songs || []).map(song => {
      const rawEnc = song.more_info?.encrypted_media_url;
      const decrypted = decryptUrl(rawEnc);
      const audioUrl = decrypted || song.more_info?.media_preview_url || song.media_preview_url;
      
      return {
        id: song.id,
        name: song.song || song.title,
        album: album.title,
        year: song.year,
        duration: song.more_info?.duration,
        primaryArtists: song.more_info?.singers || song.singers,
        image: [
          { quality: '150x150', url: song.image || album.image },
          { quality: '500x500', url: getHighQualityImage(song.image || album.image) }
        ],
        downloadUrl: createDownloadUrls(audioUrl)
      };
    });

    return {
      id: album.id,
      name: album.title,
      artist: album.primary_artists,
      year: album.year,
      image: getHighQualityImage(album.image),
      songs
    };
  } catch (error) {
    console.error("Error fetching album details:", error);
    return null;
  }
};

export const searchArtists = async (query) => {
  try {
    const response = await apiClient.get('', {
      params: {
        __call: 'search.getArtistResults',
        q: query,
        p: '1',
        n: '10',
        ctx: 'web6dot0',
        api_version: '4',
        _format: 'json',
        _marker: '0'
      }
    });

    if (response.data && response.data.results) {
      return response.data.results.map(artist => ({
        id: artist.id,
        name: artist.name,
        role: artist.role,
        image: getHighQualityImage(artist.image),
        url: artist.perma_url
      }));
    }
    return [];
  } catch (error) {
    console.error("Error searching artists:", error);
    return [];
  }
};
