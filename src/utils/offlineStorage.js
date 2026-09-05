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
    const rawCandidates = [];
    
    // Collect all available audio URLs from song metadata
    if (song.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
      song.downloadUrl.forEach(d => {
        if (d.url && typeof d.url === 'string' && d.url.trim().length > 0) {
          rawCandidates.push(d.url.trim());
        }
      });
    }
    if (song.url && typeof song.url === 'string' && song.url.trim().length > 0) {
      rawCandidates.push(song.url.trim());
    }

    if (rawCandidates.length === 0) {
      throw new Error("No download stream available for this song.");
    }
    
    // Build clean HTTPS candidates (try 320kbps, 160kbps, 96kbps variants)
    const candidates = [];
    rawCandidates.forEach(rawUrl => {
      let httpsUrl = rawUrl.replace(/^http:\/\//i, 'https://');
      httpsUrl = httpsUrl.replace('audios.saavncdn.com', 'aac.saavncdn.com');
      
      // Derived 320kbps variant
      const clean320 = httpsUrl.replace(/(_master[^/]*|_\d+\.[a-zA-Z0-9]+|\.mpd|\.m3u8)(\?.*)?$/, '_320.mp4');
      if (!candidates.includes(clean320)) candidates.push(clean320);

      // Original clean HTTPS URL
      if (!candidates.includes(httpsUrl)) candidates.push(httpsUrl);

      // Derived 160kbps variant fallback
      const clean160 = httpsUrl.replace(/(_master[^/]*|_\d+\.[a-zA-Z0-9]+|\.mpd|\.m3u8)(\?.*)?$/, '_160.mp4');
      if (!candidates.includes(clean160)) candidates.push(clean160);
    });

    let blob = null;

    // Try candidates sequentially: Direct HTTPS fetch first (bypasses Vercel 4.5MB serverless payload limit)
    for (const url of candidates) {
      // 1. Direct HTTPS fetch
      try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
          const testBlob = await response.blob();
          if (testBlob && testBlob.size > 100000) { // Valid audio > 100KB
            blob = testBlob;
            break;
          }
        }
      } catch (e) {
        console.warn("Direct fetch failed for URL:", url, e);
      }

      // 2. Fallback via /api/stream proxy
      try {
        const proxyUrl = `/api/stream?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const testBlob = await response.blob();
          if (testBlob && testBlob.size > 100000) {
            blob = testBlob;
            break;
          }
        }
      } catch (e) {
        console.warn("Proxy download failed for URL:", url, e);
      }
    }

    if (!blob || blob.size < 100000) {
      throw new Error("Failed to fetch complete audio data from all candidates");
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
