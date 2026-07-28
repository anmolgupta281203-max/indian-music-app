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

    let songs = [];
    if (response.data && response.data.list) {
      songs = response.data.list;
    } else if (response.data && Array.isArray(response.data)) {
      songs = response.data;
    }

    return songs.map(song => {
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
        featuredArtists: song.more_info?.artistMap?.featured_artists?.map(a => a.name).join(', '),
        explicitContent: song.explicit_content === "1",
        playCount: song.play_count,
        language: song.language,
        hasLyrics: song.more_info?.has_lyrics === "true",
        url: song.perma_url,
        image: [
          { quality: '150x150', url: song.image },
          { quality: '500x500', url: getHighQualityImage(song.image) }
        ],
        downloadUrl: createDownloadUrls(audioUrl)
      };
    });
  } catch (error) {
    console.error("Error fetching trending songs:", error);
    return [];
  }
};

export const searchSongs = async (query, isCustomSearch = true) => {
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

    let songs = [];
    if (response.data && response.data.results) {
      songs = response.data.results;
    }

    return songs.map(song => {
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
  } catch (error) {
    console.error("Error searching songs:", error);
    return [];
  }
};

export const fetchAlbumDetails = async (albumId) => {
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
