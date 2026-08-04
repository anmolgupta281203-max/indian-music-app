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
    // Due to YouTube/JioSaavn DRM and Vercel serverless limits, we cannot reliably download full songs.
    // As a workaround to demonstrate offline PWA functionality, we download the official iTunes preview (30s).
    const query = encodeURIComponent(`${song.name} ${song.primaryArtists || ''}`.trim());
    const itunesRes = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
    const itunesData = await itunesRes.json();
    
    if (!itunesData.results || itunesData.results.length === 0 || !itunesData.results[0].previewUrl) {
      throw new Error("No download stream available for this song.");
    }
    
    const previewUrl = itunesData.results[0].previewUrl;
    
    // Fetch the audio blob directly (Apple CDN supports CORS)
    const response = await fetch(previewUrl);
    if (!response.ok) throw new Error("Failed to fetch audio data");

    const blob = await response.blob();
    
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Save metadata and the raw blob
    const offlineSong = {
      ...song,
      blob: blob,
      downloadedAt: Date.now(),
      isOfflinePreview: true // Flag to indicate it's a preview
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
