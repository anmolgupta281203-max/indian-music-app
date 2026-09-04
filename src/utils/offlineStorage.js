const DB_NAME = 'svar-music-offline';
const DB_VERSION = 1;
const STORE_NAME = 'downloads';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const downloadSongToApp = async (song, onProgress) => {
  try {
    let downloadUrl = '';
    
    // 1. Try JioSaavn native URL
    if (song.downloadUrl && song.downloadUrl.length > 0) {
      const validDownloadUrls = song.downloadUrl.filter(d => d.url && d.url.trim().length > 0);
      if (validDownloadUrls.length > 0) {
        const bestAudio = validDownloadUrls.find(d => d.quality === '320kbps') || validDownloadUrls[validDownloadUrls.length - 1];
        downloadUrl = bestAudio.url || validDownloadUrls[0].url;
      }
    } else if (song.url) {
      downloadUrl = song.url;
    }

    if (!downloadUrl) {
      throw new Error("No download stream available for this song.");
    }
    
    // Standardize URL to 320kbps MP4
    let cleanUrl = downloadUrl.replace('audios.saavncdn.com', 'aac.saavncdn.com');
    cleanUrl = cleanUrl.replace(/(_master[^/]*|\.mpd|\.m3u8)(\?.*)?$/, '_320.mp4');

    let blob = null;

    // 1. Fetch through /api/stream proxy which has full CORS support and range handling
    try {
      const proxyUrl = `/api/stream?url=${encodeURIComponent(cleanUrl)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        blob = await response.blob();
      }
    } catch (e) {
      console.warn("Proxy audio download failed, attempting direct fetch:", e);
    }

    // 2. Fallback to direct fetch
    if (!blob || blob.size === 0) {
      try {
        const response = await fetch(cleanUrl);
        if (response.ok) {
          blob = await response.blob();
        }
      } catch (e) {
        console.warn("Direct audio fetch failed:", e);
      }
    }

    if (!blob || blob.size === 0) {
      throw new Error("Failed to fetch audio data");
    }
    
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Save metadata and the raw blob
    const offlineSong = {
      ...song,
      blob: blob,
      blobSize: blob.size,
      downloadedAt: Date.now(),
      isOffline: true
    };
    
    await new Promise((resolve, reject) => {
      const request = store.put(offlineSong);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    return true;
  } catch (err) {
    console.error("Offline Download failed:", err);
    return false;
  }
};

export const getOfflineSong = async (songId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const song = await new Promise((resolve, reject) => {
      const request = store.get(songId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return song;
  } catch (err) {
    console.error("Failed to get offline song:", err);
    return null;
  }
};

export const getAllOfflineSongs = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const songs = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return songs.sort((a, b) => b.downloadedAt - a.downloadedAt);
  } catch (err) {
    console.error("Failed to get offline songs:", err);
    return [];
  }
};

export const deleteOfflineSong = async (songId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = store.delete(songId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch (err) {
    console.error("Failed to delete offline song:", err);
    return false;
  }
};
